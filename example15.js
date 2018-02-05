var http = require("http").createServer(handler); // on req - hand
var io = require("socket.io").listen(http); // socket library
var fs = require("fs"); // variable for file system for providing html
var firmata = require("firmata");

console.log("Starting the code");

var board = new firmata.Board("/dev/ttyACM0", function(){
    console.log("Connecting to Arduino");
    console.log("Enabling analog pin 0");
    board.pinMode(0, board.MODES.ANALOG); // declare analog pin 0
    console.log("Enabling analog pin 1");
    board.pinMode(1, board.MODES.ANALOG); // declare analog pin 0
    board.pinMode(2, board.MODES.OUTPUT); // direction of DC motor
    board.pinMode(3, board.MODES.PWM); // PWM of motor i.e. speed of rotation
    board.pinMode(8, board.MODES.OUTPUT); // direction DC motor
});

function handler(req, res) {
    fs.readFile(__dirname + "/example15.html",
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

var desiredValue = 0;
var actualValue = 0;

var Kp = 0.55; // proportional factor of PID controller
var Ki = 0.008; // integral factor of PID controller
var Kd = 0.15; // differential factor of PID controller

var factor = 0.3;
var pwm = 0;
var pwmLimit = 254; // to limit value of the pwm that is sent to the motor

var controlAlgorithmStartedFlag = 0; 
var intervalCtrl; 
var errSum = 0;
var lastErr = 0;
var sendValueViaSocket = function(){}; // var for sending messages

board.on("ready", function(){
    
board.analogRead(0, function(value){
    desiredValue = value; // continuous read of analog pin 0
});

board.analogRead(1, function(value){
    actualValue = value; // continuous read of analog pin 1
});

io.sockets.on("connection", function(socket) {
    socket.emit("messageToClient", "Srv connected, board OK");

    setInterval(sendValues, 40, socket); // on 40ms trigerr func. sendValues
    
    socket.on("startControlAlgorithm", function(){
       startControlAlgorithm(); 
    });
    
    socket.on("stopControlAlgorithm", function(){
       stopControlAlgorithm(); 
    });
    
}); // end of sockets.on connection

}); // end of board.on ready

function controlAlgorithm () {
    err = desiredValue - actualValue; // error as difference between desired and actual val.
    errSum += err; // sum of errors | like integral
    dErr = err - lastErr; // difference of error
    pwm = Kp*err+Ki*errSum+Kd*dErr; // PID expression
    lastErr = err; // save the value of error for next cycle to estimate the derivative
    if (pwm > pwmLimit) {pwm =  pwmLimit}; // to limit pwm values
    if (pwm < -pwmLimit) {pwm = -pwmLimit}; // to limit pwm values
    if (pwm > 0) {board.digitalWrite(2,1); board.digitalWrite(8,0);}; // direction if > 0
    if (pwm < 0) {board.digitalWrite(2,0); board.digitalWrite(8,1);}; // direction if < 0
    board.analogWrite(3, Math.abs(pwm));
};

function startControlAlgorithm () {
    if (controlAlgorithmStartedFlag == 0) {
        controlAlgorithmStartedFlag = 1;
        intervalCtrl = setInterval(function(){controlAlgorithm();}, 30); // call the alg. on 30ms
        console.log("Control algorithm has been started.");        
    }

};

function stopControlAlgorithm () {
    clearInterval(intervalCtrl); // clear the interval of control algorihtm
    board.analogWrite(3, 0);
    controlAlgorithmStartedFlag = 0;
    console.log("Control algorithm has been stopped.");
};

function sendValues (socket) {
    socket.emit("clientReadValues",
    {
    "desiredValue": desiredValue,
    "actualValue": actualValue,
    "pwm": pwm
    });
};
