import NavMeshAgent from "src/game/NavMeshAgent";
import Vector3 = Laya.Vector3;
export default class GameLogic extends Laya.Script
{
    protected gameScene:Laya.Scene3D = null;
    protected player:Laya.Sprite3D = null;
    protected physicsSimulation:Laya.PhysicsSimulation = null;
    protected navMeshUrl:string = "navmeshs/game.json";
    protected mainCamera:Laya.Camera = null;
    protected agent:NavMeshAgent = null;
    protected isNavMeshLoaded:boolean = false;
    protected playerNavMeshGroup = null;
    protected destRay:Laya.Ray = new Laya.Ray(new Vector3(),new Vector3() );
    protected destHitResult:Laya.HitResult = new Laya.HitResult();
    protected destPosition:Vector3 = new Vector3();
    public Init(_scene:Laya.Scene3D):void
    {
        this.gameScene = _scene;
        this.player = this.gameScene.getChildByName("Player") as Laya.Sprite3D;
        this.physicsSimulation = this.gameScene.physicsSimulation;
        this.mainCamera = this.gameScene.getChildByName("Main Camera") as Laya.Camera;
        this.agent = this.player.addComponent(NavMeshAgent) as NavMeshAgent;
        this.agent.speed = 10;
        this.isNavMeshLoaded = false;
        this.loadNavMesh(this.navMeshUrl);
    }


    protected loadNavMesh(url):void
    {
        Laya.loader.load(this.navMeshUrl,Laya.Handler.create(this,this.onNavMeshLoaded),null,"json");
    }


    protected onNavMeshLoaded():void
    {
        let navJson = Laya.loader.getRes(this.navMeshUrl);
        console.log("navJson:",navJson);
        let zoneNodes  = NavMesh.buildNodesByJson(navJson);
        NavMesh.setZoneData("game",zoneNodes);
        this.playerNavMeshGroup = NavMesh.getGroup("game",this.player.transform.position);
        Laya.stage.on(Laya.Event.CLICK,this,this.onClick);
    }


    onClick()
    {
        this.mainCamera.viewportPointToRay(new Laya.Vector2(Laya.stage.mouseX,Laya.stage.mouseY),this.destRay);
        // console.log("Laya.stage.mouseX=",Laya.stage.mouseX);
        // console.log("Laya.stage.mouseY=",Laya.stage.mouseY);
        // console.log("this.destHitResult=",this.destHitResult);
        if(this.physicsSimulation.rayCast(this.destRay,this.destHitResult))
        {
            console.log("find destination! this.destHitResult=",this.destHitResult);
            this.destPosition = this.destHitResult.point;
            let calculatedPath = NavMesh.findPath(this.player.transform.position,this.destPosition,"game",this.playerNavMeshGroup);
            if(calculatedPath && calculatedPath.length)
            {
                let p = [];
                for(let i = 0;i<calculatedPath.length;i++)
                {
                    p.push(new Vector3(calculatedPath[i].x,calculatedPath[i].y+0.1,calculatedPath[i].z));
                }
                this.agent.path = [this.player.transform.position].concat(p);
                this.agent.enabled = true;
            }
            else
            {
                this.agent.enabled = false;
            }
        }
    }
    


}