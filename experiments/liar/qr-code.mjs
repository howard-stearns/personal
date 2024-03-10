var typeNumber = 4;
var errorCorrectionLevel = 'L';
var qr = qrcode(typeNumber, errorCorrectionLevel);
qr.addData(location.href);
qr.make();
qrcodeHolder.innerHTML = qr.createImgTag();
