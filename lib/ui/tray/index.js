const { Menu, Tray } = require('electron');
const path = require('path');
const Jimp = require('jimp');
const os = require('os');
const fs = require('fs');
const notifier = require('../../notifier');

const temp = path.join(os.tmpdir(), 'dublinbus');

if (!fs.existsSync(temp)) {
	fs.mkdirSync(temp);
}

function generateTextIcon(text, font, scale, filename) {
	return new Promise(function (resolve, reject) {
		const image = new Jimp(16 * scale, 16 * scale, function () {
			Jimp.loadFont(font)
				.then(function (fnt) {
					let shiftX = (0.5 * scale) - 1;
					if (text.length === 1) {
						shiftX += 4 * scale;
					}
					return image.print(fnt, shiftX, 3 * scale, text);
				})
				.then(function () {
					return new Promise(function (res) {
						const p = path.join(temp, filename);
						image.write(p, function () {
							res(path);
						});
					});
				})
				.then(function () {
					return resolve(path.join(temp, filename), image);
				})
				.catch(function (err) {
					return reject(err);
				});
		});
	});
}

function generateIcons(text) {
	const fonts = [
		{ font: 'Microsoft_Sans_Serif_Regular_16', scale: 1 },
		{ font: 'FONT_DIGITAL_7_32', scale: 2 },
		{ font: 'FONT_DIGITAL_7_48', scale: 3 }
	];
	const generateIconPromise = function (fontData) {
		const font = path.resolve(__dirname, '..', '..', 'resources', fontData.font, `${fontData.font}.fnt`);
		const filename = `${text}${fontData.scale === 1 ? '' : `@${fontData.scale}x`}.png`;
		return generateTextIcon(text, font, fontData.scale, filename);
	};
	return Promise.all(fonts.map(generateIconPromise));
}

function DBTray(opts) {
	if (!opts) {
		opts = {};
	}
	const tray = new Tray(path.resolve(__dirname, '..', '..', 'resources', 'DublinBusIcon.ico'));
	const template = [
		{ label: 'Update', type: 'normal', click: opts.onClickUpdate },
		{ label: 'Exit', type: 'normal', role: 'quit' }
	];
	const contextMenu = Menu.buildFromTemplate(template);
	tray.setContextMenu(contextMenu);
	opts.onClickIcon && tray.on('click', opts.onClickIcon);
	tray.setTextIcon = function (string) {
		// keep the icon and set the tray text on osx
		if (process.platform === 'darwin') {
			this.setTitle(string);
		} else {
			const file = path.join(temp, `${string}.png`);
			if (fs.existsSync(file)) {
				tray.setImage(file);
			} else {
				generateIcons(string)
					.then(function (img) {
						notifier.notificate(img[0]);
						tray.setImage(img[0]);
					})
					.catch(function (err) {
						console.error(err);
					});
			}
		}
	};
	return tray;
}

module.exports = DBTray;
