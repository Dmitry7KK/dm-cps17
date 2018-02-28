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
    fs.readFile(__dirname + "/example20.html",
    function (err, data) {
        if (err) {
            res.writeHead(500, {"Content-Type": "text/plain"});
            return res.end("Error loading html page.");
        }
    res.writeHead(200);
    res.end(data);
    })
}

var desiredValue = 0; // desired value var
var actualValue = 0; // actual value var

var Kp = 0.55; 
var Ki = 0.008; 
var Kd = 0.15; 


var factor = 0.3; 
var pwm = 0; 
var pwmLimit = 254; 

var err = 0; 
var errSum = 0; 
var dErr = 0; 
var lastErr = 0; 
var KpE = 0; 
var KiIedt = 0; 
var KdDe_dt = 0; 

var errSumAbs = 0;// sum of absolute errors as perfomance measure

var controlAlgorithmStartedFlag = 0; 
var intervalCtrl; 



http.listen(8080); // server will listen on port 8080

var sendValueViaSocket = function(){}; // var for sending messages
var sendStaticMsgViaSocket = function(){}; // for sending static messages

board.on("ready", function(){
    
board.analogRead(0, function(value){
    desiredValue = value; // continuous read of analog pin 0
});

board.analogRead(1, function(value){
    actualValue = value; // continuous read of analog pin 1
});

io.sockets.on("connection", function(socket) {
    socket.emit("messageToClient", "Srv connected, board OK");
    socket.emit("staticMsgToClient", "Srv connected, board OK");
    

    setInterval(sendValues, 40, socket); // on 40ms trigerr func. sendValues
    
    socket.on("startControlAlgorithm", function(numberOfControlAlgorithm){
       startControlAlgorithm(numberOfControlAlgorithm); 
    });
    
    socket.on("stopControlAlgorithm", function(){
       stopControlAlgorithm(); 
    });
    
    sendValueViaSocket = function (value) {
        io.sockets.emit("messageToClient", value);
    };
    
    sendStaticMsgViaSocket = function(value) {
        io.sockets.emit("staticMsgToClient", value);  
    };
    
}); // end of sockets.on connection

}); // end of board.on ready

function controlAlgorithm (parameters) {
    if (parameters.ctrlAlgNo == 1) {
        pwm = parameters.pCoeff*(desiredValue-actualValue);
        err = desiredValue-actualValue;
        errSumAbs += Math.abs(err);
        if (pwm > pwmLimit) {pwm =  pwmLimit}; // to limit pwm values
        if (pwm < -pwmLimit) {pwm = -pwmLimit}; // to limit pwm values
        if (pwm > 0) {board.digitalWrite(2,1); board.digitalWrite(8,0);}; // direction if > 0
        if (pwm < 0) {board.digitalWrite(2,0); board.digitalWrite(8,1);}; // direction if < 0
        board.analogWrite(3, Math.abs(pwm));
    }
    if (parameters.ctrlAlgNo == 2) {
        err = desiredValue - actualValue; // error as difference between desired and actual val.
        errSum += err; // sum of errors | like integral
        errSumAbs += Math.abs(err);
        dErr = err - lastErr; // difference of error
        // we will put parts of expression for pwm to
        // global workspace
        KpE = parameters.Kp1*err;
        KiIedt = parameters.Ki1*errSum;
        KdDe_dt = parameters.Kd1*dErr;
        pwm = KpE + KiIedt + KdDe_dt; // we use above parts
        lastErr = err; // save the value of error for next cycle to estimate the derivative
        if (pwm > pwmLimit) {pwm =  pwmLimit}; // to limit pwm values
        if (pwm < -pwmLimit) {pwm = -pwmLimit}; // to limit pwm values
        if (pwm > 0) {board.digitalWrite(2,1); board.digitalWrite(8,0);}; // direction if > 0
        if (pwm < 0) {board.digitalWrite(2,0); board.digitalWrite(8,1);}; // direction if < 0
        board.analogWrite(3, Math.abs(pwm));        
    }
    if (parameters.ctrlAlgNo == 3) {
        err = desiredValue - actualValue; // error as difference between desired and actual val.
        errSum += err; // sum of errors | like integral
        errSumAbs += Math.abs(err);
        dErr = err - lastErr; // difference of error
        // we will put parts of expression for pwm to
        // global workspace
        KpE = parameters.Kp2*err;
        KiIedt = parameters.Ki2*errSum;
        KdDe_dt = parameters.Kd2*dErr;
        pwm = KpE + KiIedt + KdDe_dt; // we use above parts
        console.log(parameters.Kp2 + "|" + parameters.Ki2 + "|" + parameters.Kd2);
        lastErr = err; // save the value of error for next cycle to estimate the derivative
        if (pwm > pwmLimit) {pwm =  pwmLimit}; // to limit pwm values
        if (pwm < -pwmLimit) {pwm = -pwmLimit}; // to limit pwm values
        if (pwm > 0) {board.digitalWrite(2,1); board.digitalWrite(8,0);}; // direction if > 0
        if (pwm < 0) {board.digitalWrite(2,0); board.digitalWrite(8,1);}; // direction if < 0
        board.analogWrite(3, Math.abs(pwm));        
    }
    

};

function startControlAlgorithm (parameters) {
    if (controlAlgorithmStartedFlag == 0) {
        controlAlgorithmStartedFlag = 1;
        intervalCtrl = setInterval(function(){controlAlgorithm(parameters);}, 30); // call the alg. on 30ms
        console.log("Control algorithm has been started.");
        sendStaticMsgViaSocket("Control alg " + parameters.ctrlAlgNo + " started | " + json2txt(parameters));
    }

};

function stopControlAlgorithm () {
    clearInterval(intervalCtrl); 
    board.analogWrite(3, 0);
    err = 0; // error as difference between desired and actual val.
    errSum = 0; // sum of errors | like integral
    dErr = 0;
    lastErr = 0; // difference
    pwm = 0;
    
    
    
    controlAlgorithmStartedFlag = 0;
    console.log("Control algorithm has been stopped.");
    sendStaticMsgViaSocket("Stopped.")
};

function sendValues (socket) {
    socket.emit("clientReadValues",
    {
    "desiredValue": desiredValue,
    "actualValue": actualValue,
    "pwm": pwm,
    "err": err,
    "errSum": errSum,
    "dErr": dErr,
    "KpE": KpE,
    "KiIedt": KiIedt,
    "KdDe_dt": KdDe_dt,
    "errSumAbs": errSumAbs
    
    });
};

function json2txt(obj) // function to print out the json names and values
{
  var txt = '';
  var recurse = function(_obj) {
    if ('object' != typeof(_obj)) {
      txt += ' = ' + _obj + '\n';
    }
    else {
      for (var key in _obj) {
        if (_obj.hasOwnProperty(key)) {
          txt += '.' + key;
          recurse(_obj[key]);
        } 
      }
    }
  };
  recurse(obj);
  return txt;
}
