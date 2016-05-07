var net = require('net');

args = process.argv.slice(2);
if (args.length != 1) {
    console.log("Incorrect number of arguments.");
    process.exit(1);
}
var port = args[0];

var server = net.createServer(function (clientSocket) {

    var haveSeenEndOfHeader = false;
    var header = "";

    clientSocket.on('data', function (data) {
        if (!haveSeenEndOfHeader) {
            var dataString = data.toString('ascii');
            header.concat(dataString);

            if (header.includes('\r\n\r\n')) {
                haveSeenEndOfHeader = true;
                var headerish = header.split('\r\n\r\n');
                var lines = headerish[0].split('\r\n');

                //TODO: make sure header is valid
                var requestLine = lines.shift().split('\w');
                var options = {};
                for (option in lines) {
                    var optionFields = option.split(':');
                    if (optionFields.length != 2) { continue; }

                    options[optionFields[0].trim()] = optionFields[1].trim();
                }
                //TODO: start DNS lookup
                //TODO: look at method
            }
        }

        //parse/modify header
        //resolve name
        //forward data
        //forward responses
    });

});

server.on('error', (err) => {
    console.log("Server error");
    process.exit(1);
    //TODO: try broadcasting to clients that we hit an error?
})

server.listen(port);