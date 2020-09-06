window.Jigsaw=(()=>{
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
			if(typeof(jgname)!="string","jgname must be specified");
			if(typeof(endpoint)!="string","endpoint must be specified");

			this.jgname=jgname;
			this.endpoint=endpoint;

			this.reqs={};
			
			this.state="close";//connecting ready close

			this.events={};
			
			this.ports={};

			this._connect();
		}
		exit(){
			this.state="dead";
			this.close();
		}
		on(event,handler){
			if(typeof(handler) != "function")
				throw new Error("handler must be a function");

			this.events[event]=handler;	
		}
		emit(event,data){
			if(this.events[event])
				this.events[event](data);	
		}
		close(){
			if(this.state=="close")
				return;

			this.ws.close();
		}
		_connect(){
			if(this.state!="close")
				return;

			this.ws=new WebSocket(`${this.endpoint}${this.jgname}`);

			this.ws.onopen=this._onWSOpen.bind(this);
			this.ws.onclose=this._onWSClose.bind(this);
			this.ws.onmessage=this._handleMessage.bind(this);

			this._heartbeater=setInterval(()=>{
				this._doHeartbeat();
			},10000);

			this.state="connecting";
			
		}
		_onWSOpen(){
			if(this.state=="ready")
				return;

			console.log('[Jigsaw]',`${this.jgname} 模块已启动`)
			this.state="ready";
			this.emit("ready");
		}
		_onWSClose(){
			if(this.state=="close")
				return;

			for(let r of Object.values(this.reqs))
				r.reject("websocket connection closed");
			
			clearInterval(this._heartbeater);



			if(this.state!="dead"){
				this.state="close";
				this.emit("close");

				console.log('[Jigsaw]',`${this.jgname} 被断开,开始重连`);
				setTimeout(()=>this._connect(),1000);
			}


		
		}
		async send(path,data){
			if(this.state!="ready")
				throw new Error("in this state, can not do send");

			return await this._wsSend({
				type:"send",
				path,
				data
			})
		}
		async port(portname,handler){
			try{
				if(this.state!="ready")
					throw new Error("in this state, can not set port");
				if(typeof(handler)!="function")
					throw new Error("handler must be a function");

			
				await this._wsSend({
					type:"setport",
					portname
				})
				this.ports[portname]=handler;
			}catch(err){
				this.close();
				throw err;
			}
			

		}
		async unport(portname){
			try{
				if(this.state!="ready")
					throw new Error("in this state, can not unset port");
					
			
				await this._wsSend({
					type:"unport",
					portname
				})
				delete this.ports[portname];
			}catch(err){
				this.close();
				throw err;
			}
			
		}
		_doHeartbeat(){
			this._wsSend({
				type:"heartbeat"
			});
		}
		async _wsSend(req){
			if(this.state!="ready")
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
				return res;			
			}catch(e){
				throw e;
			}finally{
				clearTimeout(timeout);
				delete this.reqs[reqid];
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

	return Jigsaw;
})();


