'use strict'


const PROD_MODE = navigator.platform.indexOf("Win") === -1;

$(document).ready(async function () {



	if (PROD_MODE) {
		$(".dev").hide();
	} else {
		const response = await fetch('fakeData.json');
		const json = await response.json();
		App.fakeData = json;
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
	fakeData: [],


	init: function (isProd) {


		var self = this;


		$("button").click(function (e) {
			if ('vibrate' in navigator) {
				navigator.vibrate(70);
			}
		});

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


			}

		});

		$(".trip-details-wrapper .dismiss").click(function () {
			$('.trip-details-wrapper').slideUp(400);

			//cleanup
			self.logs = [];
			self.maxSpeed = 0;
			self.N = 0;
			self.avgSpeed = 0;
			self.duration = 0;
			self.totalDistance = 0;
			self.prevSpeed = null;
			self.prevCoords = null;
		});

		$(".export").click(function (e) {
			var filename = window.prompt('Enter a name for the data file', 'myTrip');
			if (filename == null) {
				e.preventDefault();
				return;
			}
			$(".filename").val(filename);

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
			watchId = window.setInterval(function () { self.mockWatchPosition(self) }, 500);
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
			window.clearInterval(watchId);
		}
	},

	mockWatchPosition: function (self) {


		let fakeData = self.getFakePositionData();
		self.geoSuccessCallback(fakeData);
	},

	geoSuccessCallback: function (position) {

		this.logs.push(position);
		this.N += 1;

		$('.ping-indicator')
			.attr('data-accuracy-level', this.getAccuracyLevel(position.coords.accuracy))
			.animate({opacity:1.0}, 0, function(){
				$(this).animate({opacity:0.6}, 300);
			});
		

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

	getAccuracyLevel : function(accuracy) {

		if(accuracy < 4) {
			return 'good';
		} else if (accuracy >= 4 && accuracy < 12) {
			return 'moderate';
		} else if (accuracy >= 12 && accuracy < 20) {
			return 'poor';
		} else {
			return 'trash';
		}
	},

	getFakePositionData: function () {

		let tmp = this.fakeData[this.N % this.fakeData.length];
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
		let lastCoord = this.logs[this.logs.length - 1].coords;

		$('.trip-details .max-speed').html(this.getNiceSpeed(this.maxSpeed, this.metric));
		$('.trip-details .avg-speed').html(this.getNiceSpeed(Math.round(this.avgSpeed), this.metric));

		$('.trip-details .distance').html(this.getNiceDistance(s * t, this.metric));
		$('.trip-details .displacement').html(this.getNiceDistance(haversineDistance(firstCoord, lastCoord, !this.metric), this.metric));
		$('.trip-details .duration').html(this.getTimeFragment(this.duration));


		// elevation can be null, needs better logic : 
		let elevationChange = this.getElevationChange();
		if (elevationChange >= 0) {
			$('.elevation-icon').html("<i class='mdi mdi-elevation-rise'></i>");
		} else {
			$('.elevation-icon').html("<i class='mdi mdi-elevation-decline'></i>");
		}
		$('.trip-details .elevation-change').html(this.getNiceElevationChange(elevationChange, this.metric));

		let bearing = Math.round(getBearing(firstCoord, lastCoord));
		$('.trip-details .heading').html(bearing + '&deg; <span class="heading-indicator" style="transform:rotate(' + bearing + 'deg)"><i class="mdi mdi-navigation"></i></span>');
		$('.trip-details .n-gps').html(this.N);


		var data = [];

		for (var i = 0; i < this.logs.length; ++i) {

			var log = this.logs[i];
			var tmp = {
				timestamp: log.timestamp,
				coords: {
					accuracy: log.coords.accuracy,
					altitude: log.coords.altitude,
					altitudeAccuracy: log.coords.altitudeAccuracy,
					speed: log.coords.speed,
					latitude: log.coords.latitude,
					longitude: log.coords.longitude,
					heading: log.coords.heading
				}
			};

			data.push(tmp);
		}
		$('input.data').val(JSON.stringify(data));


		$(".trip-details-wrapper").slideDown(400);


	},

	getElevationChange: function () {


		let i = 0;
		let first = this.logs[i].coords.altitude;

		while (first === null && i < this.logs.length - 1) {
			first = this.logs[i].coords.altitude;
			i++;
		}


		i = this.logs.length - 1;
		let last = this.logs[i].coords.altitude;

		while (last === null && i >= 0) {
			last = this.logs[i].coords.altitude;
			--i;
		}

		var elevationChange = last - first;
		if (!this.metric) elevationChange *= 3.28084;
		return elevationChange;
	},

	getNiceElevationChange: function (elevationChange, isMetric) {
		if (elevationChange >= 0) {
			return '+ ' + Math.round(elevationChange) + (isMetric ? ' m' : ' ft');
		}
		return '' + Math.round(elevationChange) + (isMetric ? ' m' : ' ft');

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

function getBearing(start, dest) {

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
