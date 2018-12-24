$(document).ready(function(){

    console.log("we in boyz");

    let options = {maximumAge:600000, timeout:5000, enableHighAccuracy: true};
    let $speed = $(".speed");
    let $dev = $(".dev");

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(function(position){
            console.log(position);
    


            let speed = 0;
            
            if(position.coords.speed != null) {
                speed = Math.floor(position.coords.speed * 3.6);
            }

            if (speed <= 0){
                speed = '<span class="zeropad">000</span>';
            } else if(speed > 0 && speed < 10) {
                speed = '<span class="zeropad">00</span>'+speed;
            } else {
                speed = '<span class="zeropad">0</span>'+speed;
            }
            
            $speed.html(speed);

            let debug  = '\r\n accuracy         = '+position.coords.accuracy;
                debug += '\r\n altitude         = '+position.coords.altitude;
                debug += '\r\n altitudeAccuracy = '+position.coords.altitudeAccuracy;
                debug += '\r\n heading          = '+position.coords.heading;
                debug += '\r\n latitude         = '+position.coords.latitude;
                debug += '\r\n longitude        = '+position.coords.longitude;
                debug += '\r\n speed            = '+position.coords.speed;

            $dev.html(debug);
    
        },function error(msg){
            alert('Please enable your GPS position future.'+msg);  
            $dev.html(JSON.stringify(msg));
    
      }, options);
    
    }else {
        alert("Geolocation API is not supported in your browser.");
    }
});