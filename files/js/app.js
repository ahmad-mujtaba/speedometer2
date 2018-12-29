'use strict'




$(document).ready(function () {

	const PROD_MODE = true;//navigator.platform.indexOf("Win") === -1;

	if (PROD_MODE) {
		$(".dev").hide();
	}


	App.init(PROD_MODE);


});


const App = {

	maxSpeed: 0,
	N: 0,
	avgSpeed: 0,
	duration: 0,
	totalDistance: 0,
	timestamp: null,
	prevCoords: null,
	geoWatchId: null,

	stats: {},
	logs: [],
	metric: true,

	state: {
		isFocusedMode: false
	},


	init: function (isProd) {


		var self = this;


		$(".ignition").click(function (e) {

			if ('vibrate' in navigator) {
				navigator.vibrate(50);
			}

			let noSleep = new NoSleep();

			if ($('body').hasClass('idle')) {


				$('body.idle').removeClass('idle').addClass('running');

				self.timestamp = new Date().getTime();

				self.geoWatchId = self.startGeolocation(isProd);



				noSleep.enable();


			} else {
				$('body.running').removeClass('running').addClass('idle');
				self.stopGeolocation(isProd, self.geoWatchId);
				noSleep.disable();

				if (self.state.isFocusedMode) {
					self.disableFocusedMode();
				}


				self.showTripDetails();

				//cleanup
				self.logs = [];
				self.maxSpeed = 0;
				self.N = 0;
				self.avgSpeed = 0;
				self.duration = 0;
				self.totalDistance = 0;
				self.prevSpeed = null;
				self.prevCoords = null;
			}

		});

		$(".trip-details-wrapper .dismiss").click(function () {
			$('.trip-details-wrapper').hide();
		});

	},

	startGeolocation: function (isProd) {
		let options = { maximumAge: 600000, timeout: 5000, enableHighAccuracy: true };
		let watchId = null;

		let self = this;

		if (isProd) {
			if (navigator.geolocation) {
				watchId = navigator.geolocation.watchPosition(function (d) { self.geoSuccessCallback(d); }, self.geoErrorCallback, options);


			} else {
				alert("Geolocation API is not supported in your browser.");
			}
		} else {
			watchId = window.setInterval(function () { self.mockWatchPosition(self) }, 800);
			console.log('starting watchId = ' + watchId);
		}

		if (this.metric) {

			$('.speed-dial .unit').html('kmph');
		} else {
			$('.speed-dial .unit').html('mph');
		}

		return watchId;
	},

	stopGeolocation: function (isProd, watchId) {



		if (isProd) {
			if (navigator.geolocation) {
				navigator.geolocation.clearWatch(watchId);

			} else {
				alert("Geolocation API is not supported in your browser.");
			}
		} else {
			console.log('clearing watchId = ' + watchId);
			window.clearInterval(watchId);
		}
	},

	mockWatchPosition: function (self) {
		const avgSpeeds = [4, 60, 110, 220, 800];
		const randomSpeed = avgSpeeds.randomElement();

		let fakeData = self.getFakePositionData(randomSpeed);
		self.geoSuccessCallback(fakeData);
	},

	geoSuccessCallback: function (position) {

		this.logs.push(position);

		let $speed = $(".speed");
		let $dev = $(".dev");

		let speed = 0;

		if (position.coords.speed > 8.333 && !this.state.isFocusedMode) {
			this.enableFocusedMode();

		} else if (position.coords.speed <= 8.333 && this.state.isFocusedMode) {
			this.disableFocusedMode();

		}

		if (position.coords.speed != null) {
			speed = position.coords.speed * 3.6;

			if (!this.metric) {
				speed *= 0.621371;
			}

			speed = Math.round(speed);
		}

		if (this.maxSpeed < speed) {

			this.maxSpeed = speed;
		}

		this.N += 1;
		this.avgSpeed = approxRollingAverage(this.avgSpeed, speed, this.N);

		if (this.prevCoords != null) {
			let deltaD = haversineDistance(this.prevCoords, position.coords, !this.metric); // in km or miles
			this.totalDistance += deltaD;
		}

		this.prevCoords = position.coords;


		if (speed !== this.prevSpeed) {
			if (speed <= 0) {
				speed = '<span class="zeropad">000</span>';
			} else if (speed > 0 && speed < 10) {
				speed = '<span class="zeropad">00</span>' + speed;
			} else if (speed >= 10 && speed < 100) {
				speed = '<span class="zeropad">0</span>' + speed;
			} else {
				speed = speed;
			}

			$speed.html(speed);
		}

		this.prevSpeed = speed;

		let debug = '\r\n accuracy         = ' + position.coords.accuracy;
		debug += '\r\n altitude         = ' + position.coords.altitude;
		debug += '\r\n altitudeAccuracy = ' + position.coords.altitudeAccuracy;
		debug += '\r\n heading          = ' + position.coords.heading;
		debug += '\r\n latitude         = ' + position.coords.latitude;
		debug += '\r\n longitude        = ' + position.coords.longitude;
		debug += '\r\n speed            = ' + position.coords.speed;

		$dev.html(debug);

		this.duration = Math.round((new Date().getTime() - this.timestamp) / 1000);

		$(".live-stats .max-speed").html(this.getNiceSpeed(Math.round(this.maxSpeed), this.metric));
		$(".live-stats .avg-speed").html(this.getNiceSpeed(Math.round(this.avgSpeed), this.metric));
		$(".live-stats .distance").html(this.getNiceDistance(this.totalDistance, this.metric));
		$(".live-stats .elapsed").html('<span class="font-digital">' + this.getTimeFragment(this.duration) + '</span>');
	},

	geoErrorCallback: function (err) {
		alert('Please enable your GPS position future.' + err);
		$('.dev').html(JSON.stringify(err));
	},

	getFakePositionData: function (speed) {

		const accuracies = [10, 100, 1000];
		let tmp = {};

		tmp.coords = {};

		tmp.coords.accuracy = Math.round(accuracies.randomElement() * Math.random());
		tmp.coords.altitude = Math.round(458 + (Math.random() * 30));
		tmp.coords.altitudeAccuracy = Math.round(accuracies.randomElement() * Math.random());

		tmp.coords.heading = Math.round(14 + Math.random() * 45);

		tmp.coords.speed = Math.round((Math.random() * (speed / 26)) + (speed / 3.6));

		tmp.coords.latitude = 11.6081838 - Math.random() * 2;
		tmp.coords.longitude = -56.6081838 + Math.random() * 2;

		tmp.timestamp = new Date().getTime();

		return tmp;

	},

	enableFocusedMode: function () {


		const body = $('body')[0];
		let fullScreen = body.requestFullscreen || body.webkitRequestFullScreen || body.mozRequestFullScreen || body.msRequestFullscreen;
		fullScreen.call(body);

		this.state.isFocusedMode = true;

	},

	disableFocusedMode: function () {

		this.state.isFocusedMode = false;


	},

	getTimeFragment: function (seconds) {
		let s = seconds % 60;

		let h = Math.floor(seconds / 3600);
		let m = Math.floor(seconds / 60) - h * 60;

		return this.zeroPad(h) + ':' + this.zeroPad(m) + ':' + this.zeroPad(s);

	},

	getNiceSpeed: function (value, isMetric) {
		if (isMetric) {
			return value + ' kmph';
		}
		return value + ' mph';
	},

	getNiceDistance: function (value, isMetric) {

		console.log('isMetric = ' + isMetric);
		if (isMetric) {
			if (value < 1) {
				return Math.round(value * 1000) + ' m';
			} else {
				return value.toFixed(2) + ' km';
			}
		} else {
			if (value < 0.1) {
				return Math.round(value * 528) + ' ft';
			} else {
				return value.toFixed(2) + ' miles';
			}
		}

	},

	showTripDetails: function () {
		// TODO

		var s = this.avgSpeed;
		var t = this.duration / 3600;

		let firstCoord = this.logs[0].coords;
		let lastCoord =  this.logs[this.logs.length - 1].coords;

		$('.trip-details .max-speed').html(this.getNiceSpeed(this.maxSpeed, this.metric));
		$('.trip-details .avg-speed').html(this.getNiceSpeed(Math.round(this.avgSpeed), this.metric));

		$('.trip-details .distance').html(this.getNiceDistance(s * t, this.metric));
		$('.trip-details .displacement').html(this.getNiceDistance(haversineDistance(firstCoord, lastCoord, !this.metric)));
		$('.trip-details .duration').html(this.getTimeFragment(this.duration));


		// elevation can be null, needs better logic : 
		$('.trip-details .elevation-change').html(this.getNiceDistance(Math.round(this.getElevationChange() * 3.28084), false));
		$('.trip-details .heading').html(Math.round(bearing(firstCoord, lastCoord)) + ' &deg;');
		$('.trip-details .n-gps').html(this.N);

		$(".trip-details-wrapper").show();


	},

	getElevationChange : function() {

		
		let i = 0;
		let first = this.logs[i].coords.altitude;

		while(first === null && i < this.logs.length - 1) {
			first = this.logs[i].coords.altitude;
			i++;
		}


		i = this.logs.length - 1;
		let last = this.logs[i].coords.altitude;

		while(last === null && i >= 0) {
			last = this.logs[i].coords.altitude;
			--i;
		}

		console.log('first = '+first);
		console.log('last = '+last);
		return last - first;
	},

	zeroPad: function (x) {
		return x < 10 ? '0' + x : '' + x;
	}
};


Array.prototype.randomElement = function () {
	return this[Math.floor(Math.random() * this.length)]
}

function haversineDistance(coords1, coords2, isMiles) {
	function toRad(x) {
		return x * Math.PI / 180;
	}

	var lon1 = coords1.latitude;
	var lat1 = coords1.longitude;

	var lon2 = coords2.latitude;
	var lat2 = coords2.longitude;

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

	if (isMiles) d /= 1.60934;

	return d;
}

function approxRollingAverage(avg, new_sample, n) {

	let newAvg = avg;
	newAvg = newAvg - (newAvg / n);
	newAvg = newAvg + (new_sample / n);
	return newAvg;
}

function bearing(start, dest) {

	// Converts from degrees to radians.
	function toRadians(degrees) {
		return degrees * Math.PI / 180;
	};

	// Converts from radians to degrees.
	function toDegrees(radians) {
		return radians * 180 / Math.PI;
	}


	let startLat = toRadians(start.latitude);
	let startLng = toRadians(start.longitude);
	let destLat = toRadians(dest.latitude);
	let destLng = toRadians(dest.longitude);

	let y = Math.sin(destLng - startLng) * Math.cos(destLat);
	let x = Math.cos(startLat) * Math.sin(destLat) -
		Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
	let brng = Math.atan2(y, x);
	brng = toDegrees(brng);
	return (brng + 360) % 360;
}
