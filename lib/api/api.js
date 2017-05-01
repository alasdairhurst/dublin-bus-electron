const request = require('request');
const moment = require('moment');

const RTIUrlRoute = 'https://data.dublinked.ie/cgi-bin/rtpi/realtimebusinformation?stopid=%s&routeid=%r&format=json';
const RTIUrl = 'https://data.dublinked.ie/cgi-bin/rtpi/realtimebusinformation?stopid=%s&format=json';
const RTIDateFormat = 'DD/MM/YYYY h:mm:ss';

function _parseTime(timestamp) {
	return moment(timestamp, RTIDateFormat).toDate();
}

function _parseResponse(body) {
	delete body.errorcode;
	delete body.errormessage;
	delete body.numberofresults;
	body.timestamp = _parseTime(body.timestamp);
	body.results = body.results.map(function (result) {
		[
			'arrivaldatetime',
			'departuredatetime',
			'scheduledarrivaldatetime',
			'scheduleddeparturedatetime',
			'sourcetimestamp'
		].forEach(function (key) {
			result[key] = _parseTime(result[key]);
		});
		[
			'duetime',
			'departureduetime'
		].forEach(function (key) {
			if (result[key] === 'Due') {
				result[key] = 0;
			} else {
				result[key] = +result[key];
			}
		});
		return result;
	});
	return body;
}

function getRTI(stop, route, cb) {
	let url = RTIUrl;
	if (route) {
		url = RTIUrlRoute;
		url = url.replace('%r', route);
	}
	url = url.replace('%s', stop);
	console.info('requesting', url);
	request.get(url, function (err, response) {
		if (err) {
			return cb && cb(err);
		}
		let data;
		try {
			data = JSON.parse(response.body);
		} catch (e) {
			console.error(err);
			return cb && cb(e);
		}
		if (!data || +data.errorcode) {
			err = new Error(data.errormessage || 'No data in response');
			return cb && cb(err);
		}
		data = _parseResponse(data);
		cb && cb(null, data);
	});
}

module.exports = {
	getRTI: getRTI
};
