var http = require("http").createServer(handler); // on req - hand
var io = require("socket.io").listen(http); // socket library
var fs = require("fs"); // variable for file system for providing html
var firmata = require("firmata");

console.log("Starting the code");

var board = new firmata.Board("/dev/ttyACM0", function() {  
    console.log("Arduino connect");
    board.pinMode(8, board.MODES.OUTPUT); 
    board.pinMode(3, board.MODES.PWM);  
});

function handler(req, res) {
    fs.readFile(__dirname + "/example12.html",
    function (err, data) {
        if (err) {
            res.writeHead(500, {"Content-Type": "text/plain"});
            return res.end("Error loading html page.");
        }
    res.writeHead(200);
    res.end(data);
    })
}

http.listen(8080); // server will listen on port 8080

var sendValueViaSocket = function(){};

board.on("ready", function() {
    io.sockets.on("connection", function(socket) {
    console.log("Socket id: " + socket.id);
    socket.emit("messageToClient", "Srv connected, board OK");
 
    socket.on("sendPWM", function(pwm){
        board.analogWrite(3,pwm);
        socket.emit("messageToClient", "PWM set to: " + pwm);        
        console.log("pwm");
    });
    
    socket.on("left", function(value){
        board.digitalWrite(8,1);
        console.log("left");
        socket.emit("messageToClient", "Direction: left");
    });
    
    socket.on("right", function(value){
        board.digitalWrite(8,0);
        socket.emit("messageToClient", "Direction: right");
    });
    
   socket.on("stop", function(value){
        board.analogWrite(3,value);
        socket.emit("messageToClient", "STOP");
    });

    
    }); // end of sockets.on connection

}); // end of board.on ready
