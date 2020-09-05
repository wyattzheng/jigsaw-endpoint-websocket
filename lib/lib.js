const WebSocket=require("ws");
const JigsawNet=require("jigsaw.js");
const assert=require("assert");
const Path=require("path");
const EventEmitter=require("events").EventEmitter;

class WSEndpoint extends EventEmitter{
	constructor(options){
		super();

		assert(options,"options must be specified");
		assert(options.entry,"options.entry must be specified");
		assert(options.domserver,"options.domserver must be specified");

		this._options = options;
		this._port = options.port || 1001;

		this._conns = new Map();

		this._connlimit = 1000; //单实例最多允许1000个连接同时存在

		this.state = "close";
		this._start();
	}
	_start(){
		assert(this.state=="close","state must be close");

		this.server=new WebSocket.Server({
			port:this._port,
		});
		this.server.on("connection",this._onWSConnection.bind(this));
		this.state="ready";
	}
	close(){
		if(this.state=="close")return;

		this.server.close();
		this.state="close";
	}

	_sendResponse(conn,type,data){
		assert(conn,"conn must be specified");
		assert(type,"type must be specified");
		assert(data,"data must be specified");
		
		conn.send(JSON.stringify({
			type,
			...data
		}));

	}
	_onWSConnection(conn,req){
		try{
			let path_parsed=Path.parse(req.url);
			let conninfos=this._conns.values();

			assert(path_parsed.dir=="/","please provide a valid address");
			assert(path_parsed.name.length > 0,"please provide a valid address");
			assert(Array.from(conninfos).length < this._connlimit,"the amount of connections reach its max limit.")

			let jgname=path_parsed.name;
			
			for(let info of conninfos){
				//console.log(info.jgname,jgname);
				if(info.jgname==jgname)
					throw new Error("this jigsaw name has been used.")
			}

			let {jigsaw} = JigsawNet(this._options.entry,this._options.domserver);
			let jg = new jigsaw(jgname);
			jg.getLogger().setLevel("NONE");



			this._conns.set(conn,{exists:true,jgname,ports:new Set(),jigsaw:jg});

			this.emit("enter",jgname);

		}catch(err){
			this._sendResponse(conn,"system",{ok:false,err:err.stack});
			conn.close();
			return;
		}


		conn.on("message",async (message)=>{
			let reqid="";
			try{
				let msg = JSON.parse(message);
				reqid = msg.reqid;

				let ret=await this._handleMessage(msg,conn);
				this._sendResponse(conn,"response",{ok:true,reqid,data:ret});
			}catch(err){
				this._sendResponse(conn,"response",{ok:false,reqid,err:err.message});
				//console.error("error occured when handling a message.",err)
				this.emit("error",err);
			}
		});

		conn.on("error",(err)=>{
			this.emit("error",err);

//			console.error("connection error occured.",err)
		});

		conn.on("close",async ()=>{
			let conninfo=this._conns.get(conn);
			await conninfo.jigsaw.close();
			this._conns.delete(conn);

			this.emit("leave",conninfo.jgname);
		});

		
	}
	async _handleMessage(pk,conn){
		assert(pk.type,"packet type must be specified");
		//assert(pk.reqid,"reqid must be specified");

		switch(pk.type){
			case "setport":{
				assert(pk.portname,"portname must be specified");

				let conninfo=this._conns.get(conn);

				if(conninfo.ports.has(pk.portname))
					throw new Error("this port has already binded");

				conninfo.ports.add(pk.portname);
				conninfo.jigsaw.port(pk.portname,(msg)=>{
					this._handleJigsawMessage(msg,pk.portname,conn);
				})

				return {port:pk.portname};
			}
			break;
			case "getallports":{
				let conninfo=this._conns.get(conn);
				return Array.from(conninfo.ports);
			};
			break;
			case "send":{
				assert(pk.path,"path must be specified");
				assert(pk.data,"data must be specified");
				
				//请求必须指定一个请求id,之后对应的响应回复会通过这个id回复
				let conninfo=this._conns.get(conn);

				let ret=await conninfo.jigsaw.send(pk.path,pk.data);
				return {data:ret};
			};
			break;

			default:
				throw new Error("unknown type of packet");
		}
	
	}
	_handleJigsawMessage(msg,portname,conn){
		this._sendResponse(conn,"port",{port:portname,msg});
	}

}

module.exports=WSEndpoint;

