
var http = require("http").createServer(handler); 
var io = require("socket.io").listen(http); 
var fs = require("fs"); 
var firmata = require("firmata");

console.log("Starting the code");

var board = new firmata.Board("/dev/ttyACM0", function(){
    console.log("Connecting to Arduino");
    console.log("Activation of Pin 13");
    board.pinMode(13, board.MODES.OUTPUT); 
    console.log("Enabling pin 2 for button");
    board.pinMode(2, board.MODES.INPUT);
});

function handler(req, res) {
    fs.readFile(__dirname + "/example09.html",
    function (err, data) {
        if (err) {
            res.writeHead(500, {"Content-Type": "text/plain"});
            return res.end("Error loading html page.");
        }
    res.writeHead(200);
    res.end(data);
    })
}

http.listen(8080); 

var sendValueViaSocket = function(){};

board.on("ready", function() {
    io.sockets.on("connection", function(socket) {
    console.log("Socket id: " + socket.id);
    socket.emit("messageToClient", "Srv connected, board OK");
    
      
    clientIpAddress = socket.request.socket.remoteAddress;
    io.sockets.emit("messageToClient", "socket.request.socket.remoteAddress: " + socket.request.socket.remoteAddress);
    io.sockets.emit("messageToClient", "socket.request.connection._peername.family: " + socket.request.connection._peername.family);
    io.sockets.emit("messageToClient", "socket.request.connection._peername.port: " + socket.request.connection._peername.port);
    io.sockets.emit("messageToClient", "socket.id: " + socket.id);
    var idx = clientIpAddress.lastIndexOf(':');
    var address4;
    if (~idx && ~clientIpAddress.indexOf('.')) address4 = clientIpAddress.slice(idx + 1);
    io.sockets.emit("messageToClient", "ipv4 address: " + socket.request.socket.remoteAddress);
    io.sockets.emit("messageToClient", "Client data ----------------------------->");
    
    sendValueViaSocket = function(value) {
        io.sockets.emit("messageToClient", value);
    }
    
    }); 
    var timeout = false;
    var last_sent = null;
    var last_value = null;
    
    
board.digitalRead(2, function(value) { 
    if (timeout !== false) { 
	   clearTimeout(timeout); 
    }
    timeout = setTimeout(function() { 
        console.log("Timeout set to false");
        timeout = false;
        if (last_value != last_sent) { 
        	if (value == 0) {
                console.log("LED OFF");
                board.digitalWrite(13, board.LOW);
                console.log("value = 0, LED OFF");
                sendValueViaSocket(0);
            }
            else if (value == 1) {
                console.log("LED ON");
                board.digitalWrite(13, board.HIGH);
                console.log("value = 1, LED lit");
                sendValueViaSocket(1);
            }

        }

        last_sent = last_value;
    }, 50); 
                
    last_value = value; 
                
}); 
    
}); 
