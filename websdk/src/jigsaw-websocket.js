function Defer(){
	const deferred = {};

	deferred.promise = new Promise((resolve, reject) => {
		deferred.resolve = resolve;
		deferred.reject = reject;
	});

	return deferred;
}
	
class Jigsaw{
	constructor(jgname,endpoint){
		this.reqs={};

		this.ws=new WebSocket(`${endpoint}${jgname}`);

		this.state="close";

		this.ws.onopen=this._onWSOpen.bind(this);
		this.ws.onclose=this._onWSClose.bind(this);
		this.ws.onmessage=this._handleMessage.bind(this);

		this._heartbeater=setInterval(()=>{
			this._doHeartbeat();
		},10000);

		this.ports={};
	}

	_onWSOpen(){
		this.state="open";
	}
	_onWSClose(){
		for(let r of Object.values(this.reqs))
			r.reject("websocket connection closed");
		
		clearInterval(this._heartbeater);
		this.state="close";

	}
	async send(path,data){
		if(this.state!="open")
			throw new Error("in this state, can not do send");

		return await this._wsSend({
			type:"send",
			path,
			data
		})
	}
	async port(portname,handler){
		if(this.state!="open")
			throw new Error("in this state, can not set port");
		if(typeof(handler)!="function")
			throw new Error("handler must be a function");

		await this._wsSend({
			type:"setport",
			portname
		});

		this.ports[portname]=handler;
	}
	_doHeartbeat(){
		this._wsSend({
			type:"heartbeat"
		});
	}
	async _wsSend(req){
		if(this.state!="open")
			throw new Error("in this state, can not do _wsSend");

		let reqid=Math.random()+"";
		let defer=Defer();
		req.reqid=reqid;

		this.ws.send(JSON.stringify(req));

		let timeout=setTimeout(()=>{
			this.reqs[reqid].reject("timeout");
		},10000);

		this.reqs[reqid]=defer;


		try{
			let res = await defer.promise;

			clearTimeout(timeout);
			delete this.reqs[reqid];

			return res;			
		}catch(e){
			clearTimeout(timeout);
			delete this.reqs[reqid];

			throw e;
		}


	}
	_handleMessage({data}){
		try{
			let req=JSON.parse(data);

			if(req.type=="port"){
				if(!this.ports[req.port])
					throw new Error("该接口不存在");

				this.ports[req.port](req.msg);
			}else if(req.type=="response"){
				
				if(req.ok)
					this.reqs[req.reqid].resolve(req.data.data);
				else {
					this.reqs[req.reqid].reject(req.err);
				}

			}else if(req.type=="error"){
				console.error(req.err);
			}else
				throw new Error("不存在该回复包类型");

		}catch(err){
			console.error("处理jigsaw回复的时候发生了错误",err);
		}

	}


}


window.Jigsaw=Jigsaw;
