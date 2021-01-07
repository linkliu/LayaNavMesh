(function () {
    'use strict';

    var Scene = Laya.Scene;
    var REG = Laya.ClassUtils.regClass;
    var ui;
    (function (ui) {
        var test;
        (function (test) {
            class TestSceneUI extends Scene {
                constructor() { super(); }
                createChildren() {
                    super.createChildren();
                    this.loadScene("test/TestScene");
                }
            }
            test.TestSceneUI = TestSceneUI;
            REG("ui.test.TestSceneUI", TestSceneUI);
        })(test = ui.test || (ui.test = {}));
    })(ui || (ui = {}));

    class GameUI extends ui.test.TestSceneUI {
        constructor() {
            super();
            var scene = Laya.stage.addChild(new Laya.Scene3D());
            var camera = (scene.addChild(new Laya.Camera(0, 0.1, 100)));
            camera.transform.translate(new Laya.Vector3(0, 3, 3));
            camera.transform.rotate(new Laya.Vector3(-30, 0, 0), true, false);
            var directionLight = scene.addChild(new Laya.DirectionLight());
            directionLight.color = new Laya.Vector3(0.6, 0.6, 0.6);
            directionLight.transform.worldMatrix.setForward(new Laya.Vector3(1, -1, 0));
            var box = scene.addChild(new Laya.MeshSprite3D(Laya.PrimitiveMesh.createBox(1, 1, 1)));
            box.transform.rotate(new Laya.Vector3(0, 45, 0), false, false);
            var material = new Laya.BlinnPhongMaterial();
            Laya.Texture2D.load("res/layabox.png", Laya.Handler.create(null, function (tex) {
                material.albedoTexture = tex;
            }));
            box.meshRenderer.material = material;
        }
    }

    class GameConfig {
        constructor() {
        }
        static init() {
            var reg = Laya.ClassUtils.regClass;
            reg("script/GameUI.ts", GameUI);
        }
    }
    GameConfig.width = 640;
    GameConfig.height = 1136;
    GameConfig.scaleMode = "fixedwidth";
    GameConfig.screenMode = "none";
    GameConfig.alignV = "top";
    GameConfig.alignH = "left";
    GameConfig.startScene = "test/TestScene.scene";
    GameConfig.sceneRoot = "";
    GameConfig.debug = false;
    GameConfig.stat = false;
    GameConfig.physicsDebug = false;
    GameConfig.exportSceneToJson = true;
    GameConfig.init();

    class NavMeshAgent extends Laya.Script3D {
        constructor() {
            super();
            this.navMeshGroup = null;
            this.updateRotation = false;
            this._pathPending = false;
            this._path = null;
            this._pathp = 0;
            this._pathlen = 0;
            this._remainingDistance = 1;
            this.destination = null;
            this.speed = 1;
            this.steeringTarget = new Laya.Vector3();
            this._velocity = new Laya.Vector3();
            this.out = new Laya.Vector3();
            this.enabled = false;
        }
        onUpdate() {
            if (this.enabled) {
                let currentPos = this.owner.transform.position;
                if (this._path) {
                    let v = new Laya.Vector3;
                    let tp = null;
                    for (let i = this._pathp; i < this._path.length - 1; i++) {
                        let p0 = this._path[i];
                        let p1 = this._path[i + 1];
                        this._pathlen = this._pathlen + this.speed / 60;
                        let tlen = Laya.Vector3.distance(p0, p1);
                        if (this._pathlen > tlen) {
                            this._pathlen -= tlen;
                            this._pathp++;
                        }
                        else {
                            tp = p0.clone();
                            p1.cloneTo(this.steeringTarget);
                            Laya.Vector3.subtract(p1, p0, v);
                            Laya.Vector3.normalize(v, v);
                            Laya.Vector3.scale(v, this._pathlen, v);
                            Laya.Vector3.add(p0, v, tp);
                            break;
                        }
                    }
                    if (tp == null) {
                        this._pathPending = false;
                        tp = this._path[this._path.length - 1];
                        this._path[this._path.length - 1].cloneTo(this.steeringTarget);
                    }
                    this.owner.transform.position = tp;
                }
                else {
                    this.out.x = currentPos.x + this.velocity.x * Laya.timer.delta / 1000;
                    this.out.y = currentPos.y + this.velocity.y * Laya.timer.delta / 1000;
                    this.out.z = currentPos.z + this.velocity.z * Laya.timer.delta / 1000;
                    if (this.navMeshGroup == null) {
                        this.out.cloneTo(currentPos);
                        this.owner.transform.position = currentPos;
                    }
                }
            }
        }
        get remainingDistance() {
            if (this.destination && this.owner) {
                return Laya.Vector3.distance(this.destination, this.owner.transform.position);
            }
            return this._remainingDistance;
        }
        set remainingDistance(value) {
            this._remainingDistance = value;
        }
        get velocity() {
            return this._velocity;
        }
        set velocity(value) {
            this._velocity = value;
            this.destination = null;
        }
        get path() {
            return this._path;
        }
        set path(value) {
            this._path = value;
            if (value) {
                this._pathPending = true;
            }
            else {
                this._pathPending = false;
            }
            this._pathp = 0;
            this._pathlen = 0;
        }
    }

    var Vector3 = Laya.Vector3;
    class GameLogic extends Laya.Script {
        constructor() {
            super(...arguments);
            this.gameScene = null;
            this.player = null;
            this.physicsSimulation = null;
            this.navMeshUrl = "navmeshs/game.json";
            this.mainCamera = null;
            this.agent = null;
            this.isNavMeshLoaded = false;
            this.playerNavMeshGroup = null;
            this.destRay = new Laya.Ray(new Vector3(), new Vector3());
            this.destHitResult = new Laya.HitResult();
            this.destPosition = new Vector3();
        }
        Init(_scene) {
            this.gameScene = _scene;
            this.player = this.gameScene.getChildByName("Player");
            this.physicsSimulation = this.gameScene.physicsSimulation;
            this.mainCamera = this.gameScene.getChildByName("Main Camera");
            this.agent = this.player.addComponent(NavMeshAgent);
            this.agent.speed = 10;
            this.isNavMeshLoaded = false;
            this.loadNavMesh(this.navMeshUrl);
        }
        loadNavMesh(url) {
            Laya.loader.load(this.navMeshUrl, Laya.Handler.create(this, this.onNavMeshLoaded), null, "json");
        }
        onNavMeshLoaded() {
            let navJson = Laya.loader.getRes(this.navMeshUrl);
            console.log("navJson:", navJson);
            let zoneNodes = NavMesh.buildNodesByJson(navJson);
            NavMesh.setZoneData("game", zoneNodes);
            this.playerNavMeshGroup = NavMesh.getGroup("game", this.player.transform.position);
            Laya.stage.on(Laya.Event.CLICK, this, this.onClick);
        }
        onClick() {
            this.mainCamera.viewportPointToRay(new Laya.Vector2(Laya.stage.mouseX, Laya.stage.mouseY), this.destRay);
            if (this.physicsSimulation.rayCast(this.destRay, this.destHitResult)) {
                console.log("find destination! this.destHitResult=", this.destHitResult);
                this.destPosition = this.destHitResult.point;
                let calculatedPath = NavMesh.findPath(this.player.transform.position, this.destPosition, "game", this.playerNavMeshGroup);
                if (calculatedPath && calculatedPath.length) {
                    let p = [];
                    for (let i = 0; i < calculatedPath.length; i++) {
                        p.push(new Vector3(calculatedPath[i].x, calculatedPath[i].y + 0.1, calculatedPath[i].z));
                    }
                    this.agent.path = [this.player.transform.position].concat(p);
                    this.agent.enabled = true;
                }
                else {
                    this.agent.enabled = false;
                }
            }
        }
    }

    class Main {
        constructor() {
            if (window["Laya3D"])
                Laya3D.init(GameConfig.width, GameConfig.height);
            else
                Laya.init(GameConfig.width, GameConfig.height, Laya["WebGL"]);
            Laya["Physics"] && Laya["Physics"].enable();
            Laya["DebugPanel"] && Laya["DebugPanel"].enable();
            Laya.stage.scaleMode = GameConfig.scaleMode;
            Laya.stage.screenMode = GameConfig.screenMode;
            Laya.stage.alignV = GameConfig.alignV;
            Laya.stage.alignH = GameConfig.alignH;
            Laya.URL.exportSceneToJson = GameConfig.exportSceneToJson;
            if (GameConfig.debug || Laya.Utils.getQueryString("debug") == "true")
                Laya.enableDebugPanel();
            if (GameConfig.physicsDebug && Laya["PhysicsDebugDraw"])
                Laya["PhysicsDebugDraw"].enable();
            if (GameConfig.stat)
                Laya.Stat.show();
            Laya.alertGlobalError(true);
            Laya.ResourceVersion.enable("version.json", Laya.Handler.create(this, this.onVersionLoaded), Laya.ResourceVersion.FILENAME_VERSION);
        }
        onVersionLoaded() {
            Laya.AtlasInfoManager.enable("fileconfig.json", Laya.Handler.create(this, this.onConfigLoaded));
        }
        onConfigLoaded() {
            Laya.Scene3D.load("3dres/Conventional/game.ls", Laya.Handler.create(this, (_scene) => {
                let loadedScene = _scene;
                Laya.stage.addChildAt(_scene, 0);
                let gameLogic = Laya.stage.addComponent(GameLogic);
                gameLogic.Init(loadedScene);
            }));
        }
    }
    new Main();

}());
