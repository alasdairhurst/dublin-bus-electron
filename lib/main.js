const electron = require('electron');
const api = require('./api/api');
const index = require('./ui/index');
const moment = require('moment');
const notifier = require('./notifier');
const log = require('electron-log');

// Module to control application life.
const app = electron.app;

// config
const trayUpdateInterval = 1000 * 10;
const fetchInterval = 1000 * 60;
const trayIgnoreBefore = 8;
const stopID = '878';
const routeID = '11';

let tray;
const rti = {
	lastFetched: null,
	data: {}
};

function setLastUpdated() {
	let tooltip = '';
	if (!rti.lastFetched) {
		tooltip = 'No Data.';
	} else {
		const now = new Date();
		if (moment(rti.lastFetched).diff(now) > 0) {
			tooltip = 'Last updated just now.';
		} else {
			tooltip = `Last updated ${moment(rti.lastFetched).from(now)}.`;
		}
	}
	tray.setToolTip(tooltip);
}

let trayTextUpdateTimeout;

function stopTrayTextUpdate() {
	clearTimeout(trayTextUpdateTimeout);
}

function startTrayTextUpdate() {
	stopTrayTextUpdate();
	setLastUpdated();
	trayTextUpdateTimeout = setTimeout(startTrayTextUpdate, trayUpdateInterval);
}

function setTrayText() {
	if (!rti.data || !rti.data.results) {
		return tray.setTextIcon('');
	}
	// only show the first result we care about
	const results = rti.data.results.filter(function (result) {
		return result.duetime >= trayIgnoreBefore;
	});
	let dueTime;
	if (!results.length) {
		dueTime = rti.data.results[0].duetime;
	} else {
		dueTime = results[0].duetime;
	}
	tray.setTextIcon(dueTime.toString());
}

function fetch(cb) {
	api.getRTI(stopID, routeID, function (err, data) {
		if (err) {
			log.error('ERROR:', err);
			return cb && cb(err);
		} else {
			rti.lastFetched = data.timestamp;
			rti.data = data;
		}
		startTrayTextUpdate();
		setTrayText();
		cb && cb();
	});
}

let fetchUpdateTimeout;

function stopFetchUpdate() {
	clearTimeout(fetchUpdateTimeout);
}

function startFetchUpdate() {
	stopFetchUpdate();
	fetch();
	fetchUpdateTimeout = setTimeout(startFetchUpdate, fetchInterval);
}

function getDueString(bus) {
	if (!bus) {
		return '';
	}
	let str = `${bus.route} to ${bus.destination} due`;
	if (bus.duetime) {
		str += ` in ${bus.duetime} minutes`;
	}
	return str;
}

function notifyShowLatestBusses() {
	if (!rti.data || !rti.data.results) {
		return;
	}
	const busses = rti.data.results;
	const message = busses.map(getDueString).join('\n');
	notifier.notificate('Dublin Bus', message);
}

app.on('uncaughtException', function (error) {
	log.error(error);
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function () {
	tray = new index.Tray({
		onClickUpdate: function () { startFetchUpdate(); },
		onClickIcon: notifyShowLatestBusses
	});
	index.createWindow();
	startFetchUpdate();
});
