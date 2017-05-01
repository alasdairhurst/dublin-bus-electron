const notifier = require('node-notifier');
const path = require('path');

function sendNotification(title, message, cb) {
	if (!title || !message) {
		throw new Error('Title or Message required');
	}
	notifier.notify({
		title: title,
		message: message,
		icon: path.resolve('./lib/resources/DublinBusIcon.ico'),
		wait: !!cb
	}, cb);
}

module.exports = {
	notificate: sendNotification
};
