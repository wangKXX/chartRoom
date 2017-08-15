var express = require('express'),
	body = require('body-parser'),
	http = require('http'),
	path = require('path'),
	domain = require("domain"),
	socketIo = require('socket.io');

var app = express();

// all environments
app.set('port', process.env.PORT || 8086);
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').__express);
app.set('view engine', 'html');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
/*
 * tips:用domain作为express的中间件处理所有request和response的异步请求
 * */
app.configure(function() {
	app.use(function(res, req, next) {
		var reqDomain = domain.create();
		reqDomain.on('error', function(err) {
			console.log('捕获请求异常');
			res.send(500, err.stack);
		});
		reqDomain.run(next);
	});
});
/*
 tips:process对象是NOde的全局进程对象，包括了该进程的信息
 * */
process.on("uncaughtException", function(err) {
	console.error("uncaughtException ERROR");
	if(typeof err === 'object') {
		if(err.message) {
			console.error('ERROR: ' + err.message)
		}
		if(err.stack) {
			console.error(err.stack);
		}
	} else {
		console.error('argument is not an object');
	}
});
if('development' == app.get('env')) {
	app.use(express.errorHandler());
}
app.get("/", function(req, res) {
	res.render('index');
})

var server = http.createServer(app).listen(app.get('port'), function() {
	console.log('服务启动' + app.get('port'));
});
var onlineUser = {};
var onlineUsername = [];
io = socketIo.listen(server);
io.on('connection', function(socket) {
	socket.on('user', function(data) {
		var clite = {
			'socket': socket
		};
		if(data in onlineUser) {
			socket.emit('xterror', true);
			
		} else {
			onlineUser[data] = clite;
			onlineUsername.push(data);
			for(var key in onlineUser) {
				if(key != data){
					var newArr = [];
					newArr.push(data);
					onlineUser[key].socket.emit("sendAllUser", newArr);
				}
				if(key == data){
					onlineUser[key].socket.emit("sendAllUser", onlineUsername);
				}
				
			}
			socket.emit('xterror', false);
		}
	});
	
	//群发消息
	
	socket.on('mesg', function(From, to, mesg) {
		if(to in onlineUser) {
			onlineUser[to].socket.emit('pmesg', {
				mess: mesg,
				FromTo: From
			});
		} else {
			onlineUser[to].socket.emit('xt', {
				mess: "成员已离线"
			});
		}
	});
	
	socket.on("allPerson",function(data){
			socket.broadcast.emit("allmsg",{data:"系统维护！！！"});
	});
	//在线人员
	socket.on('getUser', function() {
		socket.emit('sendAllUser', onlineUsername);
	});

	//删除用户socket
	socket.on("delUser", function(name) {
		delete onlineUsername[name];
	});
	
	socket.on('disconnect', function(username){
	    console.log('user disconnected');
	    socket.broadcast.emit("leave",{data:username});
	});
    
});