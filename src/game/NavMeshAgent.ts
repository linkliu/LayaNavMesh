import Vector3 = Laya.Vector3;
export default class NavMeshAgent extends Laya.Script3D {
    navMeshGroup = null;
    updateRotation = false;
    _pathPending = false;
    //路线进行中
    _path = null;
    _pathp = 0;
    _pathlen = 0;
    _remainingDistance = 1;
    destination:Vector3 = null;
    speed = 1;
    steeringTarget = new Laya.Vector3();
    _velocity = new Laya.Vector3();
    out = new Laya.Vector3();
	constructor(){
        super();
        this.enabled = false;
	}

    onUpdate()
    {
        if (this.enabled)
        {
			let currentPos = (this.owner as Laya.Sprite3D).transform.position;
            if (this._path)
            {
				let v = new Laya.Vector3;
				let tp = null;
                for (let i = this._pathp;i < this._path.length-1;i++)
                {
					let p0 = this._path[i];
					let p1 = this._path[i+1];
					this._pathlen = this._pathlen + this.speed/60;
					let tlen = Laya.Vector3.distance(p0,p1);
                    if (this._pathlen > tlen)
                    {
						this._pathlen -= tlen;
						this._pathp++;
                    }
                    else
                    {
						tp = p0.clone();
						p1.cloneTo(this.steeringTarget);
						Laya.Vector3.subtract(p1,p0,v);
						Laya.Vector3.normalize(v,v);
						Laya.Vector3.scale(v,this._pathlen,v);
						Laya.Vector3.add(p0,v,tp);
						break ;
					}
				}
                if (tp==null)
                {
					this._pathPending = false;
					tp = this._path[this._path.length-1];
					this._path[this._path.length-1].cloneTo(this.steeringTarget);
				}
				(this.owner as Laya.Sprite3D).transform.position = tp;
            }
            else
            {
				this.out.x=currentPos.x+this.velocity.x *Laya.timer.delta/1000;
				this.out.y=currentPos.y+this.velocity.y *Laya.timer.delta/1000;
				this.out.z=currentPos.z+this.velocity.z *Laya.timer.delta/1000;
                if (this.navMeshGroup==null)
                {
					this.out.cloneTo(currentPos);
					(this.owner as Laya.Sprite3D).transform.position = currentPos;
				}
			}
		}
	}
    get remainingDistance()
    {
        if (this.destination&&this.owner)
        {
			return Laya.Vector3.distance(this.destination,(this.owner as Laya.Sprite3D).transform.position);
		}
		return this._remainingDistance;
	}
    set remainingDistance(value)
    {
		this._remainingDistance = value;
	}

    get velocity()
    {
		return this._velocity;
	}
    set velocity(value)
    {
		this._velocity = value;
		this.destination = null;
	}

    get path()
    {
		return this._path;
	}
    set path(value)
    {
		this._path=value;
        if(value)
        {
			this._pathPending=true;
        }
        else
        {
			this._pathPending=false;
		}
		this._pathp=0;
		this._pathlen=0;
	}
}