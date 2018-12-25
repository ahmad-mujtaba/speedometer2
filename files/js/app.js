'use strict'

$(document).ready(function(){

    const PROD_MODE = true;//navigator.platform.indexOf("Win") === -1;

    if(PROD_MODE) {
        $(".dev").hide();
    }


    App.init(PROD_MODE);

    console.log("we in boyz");

    
});


const App = {

    maxSpeed : 0,
    N : 0,
    avgSpeed : 0,
    totalDistance : 0,
    timestamp : new Date().getTime(),
    prevLat:null,
    prevLon:null,


    init : function(isProd) {


        var _this = this;
        $(".start").click(function(e){
            $('.start-wrapper').fadeOut(300, function() {
                $(this).remove();
                _this.startGeolocation(isProd);
                let noSleep = new NoSleep();
                noSleep.enable();
            });
        });
        
    },

    startGeolocation : function(isProd) {
        let options = {maximumAge:600000, timeout:5000, enableHighAccuracy: true};
        
    
        let _this = this;

        if(isProd) {
            if (navigator.geolocation) {
                navigator.geolocation.watchPosition(function(d){_this.geoSuccessCallback(d);},  _this.geoErrorCallback, options);
            
            } else {
                alert("Geolocation API is not supported in your browser.");
            }
        } else {
            let p = window.setInterval(function(){_this.mockWatchPosition(_this)}, 800);
        }
        
    },

    mockWatchPosition : function(_this) {
        const avgSpeeds = [4, 60, 110, 220, 800];
        const randomSpeed = avgSpeeds.randomElement();
        
        let fakeData = _this.getFakePositionData(randomSpeed);
        _this.geoSuccessCallback(fakeData);
    },

    geoSuccessCallback : function(position) {
        //console.log(position);

        let $speed = $(".speed");
        let $dev = $(".dev");

        let speed = 0;
        
        if(position.coords.speed != null) {
            speed = Math.round(position.coords.speed * 3.6);
        }

        console.log(this.maxSpeed);

        if(this.maxSpeed < speed) {

            
            this.maxSpeed = speed;
        }

        this.N += 1;
        this.avgSpeed = approxRollingAverage(this.avgSpeed, speed, this.N);

        if(this.prevLat != null && this.prevLon != null) {
            let prevCoords = [this.prevLat,this.prevLon];

            this.totalDistance += haversineDistance(prevCoords, [position.coords.latitude, position.coords.longitude], false);
        }

        this.prevLat = position.coords.latitude;
        this.prevLon = position.coords.longitude;
        

        if (speed <= 0){
            speed = '<span class="zeropad">000</span>';
        } else if(speed > 0 && speed < 10) {
            speed = '<span class="zeropad">00</span>'+speed;
        } else if(speed >= 10 && speed < 100) {
            speed = '<span class="zeropad">0</span>'+speed;
        } else {
            speed = speed;
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
        

        $(".max-speed").html('<span class="font-digital">' +Math.round(this.maxSpeed) + '</span> kmph');
        $(".avg-speed").html('<span class="font-digital">' +Math.round(this.avgSpeed) + '</span> kmph');
        $(".distance").html('<span class="font-digital">' + (this.totalDistance / 1000).toFixed(2) + '</span> km');
        $(".elapsed").html('<span class="font-digital">'+this.getTimeFragment(Math.round((new Date().getTime() - this.timestamp)/ 1000))+'</span>');

        
    
        
    },

    geoErrorCallback : function(err) {
        alert('Please enable your GPS position future.'+err);  
        $('.dev').html(JSON.stringify(err));
    },

    getFakePositionData : function(speed) {

        const accuracies = [10, 100, 1000];
        let tmp = {};

        tmp.coords = {};

        tmp.coords.accuracy = Math.round(accuracies.randomElement() * Math.random());
        tmp.coords.altitude = Math.round(458 + (Math.random() * 30));
        tmp.coords.altitudeAccuracy = Math.round(accuracies.randomElement() * Math.random());

        tmp.coords.heading = Math.round(14 + Math.random() * 45);

        tmp.coords.speed = Math.round((Math.random() * (speed / 26)) + (speed / 3.6));

        tmp.coords.latitude = 11.6081838 - Math.random()*2;
        tmp.coords.longitude = -56.6081838 + Math.random()*2;

        tmp.timestamp = new Date().getTime();

        return tmp;
        
    },


    getTimeFragment : function(seconds) {
        let s = seconds % 60;
        let m = Math.floor(seconds / 60);
        let h = Math.floor(seconds / 3600);

        return this.zeroPad(h) + ':' +this.zeroPad(m) + ':' + this.zeroPad(s);

    },

    zeroPad : function(x) {
        return x < 10 ? '0'+x : ''+x;
    }




};


Array.prototype.randomElement = function () {
    return this[Math.floor(Math.random() * this.length)]
}

function haversineDistance(coords1, coords2, isMiles) {
    function toRad(x) {
      return x * Math.PI / 180;
    }
  
    var lon1 = coords1[0];
    var lat1 = coords1[1];
  
    var lon2 = coords2[0];
    var lat2 = coords2[1];
  
    var R = 6371; // km
  
    var x1 = lat2 - lat1;
    var dLat = toRad(x1);
    var x2 = lon2 - lon1;
    var dLon = toRad(x2)
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
  
    if(isMiles) d /= 1.60934;
  
    //console.log(d);
    return d;
  }

  function approxRollingAverage(avg, new_sample, n) {

    let newAvg = avg;
    newAvg = newAvg - (newAvg / n);
    newAvg = newAvg + (new_sample / n);
    return newAvg;
}