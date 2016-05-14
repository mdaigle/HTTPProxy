var net = require('net');
var dns = require('dns');
var date = new Date();

//TODO: make sure CONNECT works

var args = process.argv.slice(2);
if (args.length != 1) {
    console.log("Incorrect number of arguments.");
    process.exit(1);
}
var clientFacingPort = args[0];

var server = net.createServer(function (clientSocket) {
    var haveSeenEndOfHeader = false;
    var header = "";
    // Should create server socket here to avoid delay on data
    var serverSocket = net.Socket();

    clientSocket.on('end', function() {
        serverSocket.end();
    });
    serverSocket.on('end', function() {
        clientSocket.end();
    });
    serverSocket.on('error', function(err) {
        clientSocket.end();
        serverSocket.end();
    });
    clientSocket.on('error', function(err) {
        clientSocket.end();
        serverSocket.end();
    });

    serverSocket.on('data', function(data) {
        clientSocket.write(data);
    });


    // do we need to pass as an argument
    clientSocket.on('data', function (data, serverSock) {
        if (!haveSeenEndOfHeader) {
            var dataString = data.toString('ascii');
            header += dataString;
            if (header.includes('\r\n\r\n')) {
                haveSeenEndOfHeader = true;
                var trimmedHeader = header.split('\r\n\r\n');
                var headerLines = trimmedHeader[0].split('\r\n');
                var extraData = trimmedHeader[1];

                // Take the first line and split it on white space
                var requestLineComponents = headerLines.shift().trim().split(/\s+/);
                if (requestLineComponents.length != 3) {
                    console.log("Malformed request line, invalid length");
                    clientSocket.end();
                    return;
                }

                var requestType = requestLineComponents[0].toUpperCase();
                var requestURI = requestLineComponents[1];
                var requestVersion = requestLineComponents[2].toUpperCase();

                if (HTTP_METHODS.indexOf(requestType) == -1){
                    // Malformed request.
                    console.log("Malformed request line, method not valid");
                    clientSocket.end();
                    return;
                }
                if (requestVersion != "HTTP/1.1"){
                    // We only support 1.1
                    console.log("Unsupported version", requestVersion);
                    clientSocket.end();
                    return
                }

                logRequest(requestType, requestURI)

                var optionMap = buildOptionMap(headerLines);

                // Modify header fields
                requestLineComponents[2] = "HTTP/1.0"
                if ("connection" in optionMap) {
                    optionMap["connection"] = "close";
                }
                if ("proxy-connection" in optionMap) {
                    optionMap["proxy-connection"] = "close";
                }


                if (!("host" in optionMap)) {
                    // All 1.1 messages should have a host field
                    clientSocket.end();
                    return;
                }
                // Could ipv6 cause there to be multiple : in host?
                var hostFieldComponents = optionMap.host.split(':');

                var hostName = hostFieldComponents[0];
                var hostPort = determineServerPort(hostFieldComponents, requestURI);

                function connectToServer(hostname, port) {
                    // Assign on msg based upon connection type Connect vs Get
                    // each callback should have a static definition (?)
                    if (requestType == "CONNECT") {
                        serverSocket.on("error", function() {
                            // send 502 bad gateway
                            var msg = "HTTP/1.1 502 Bad Gateway\r\n\r\n";
                            clientSocket.write(msg, function() {
                                clientSocket.end();
                            });
                        });
                        serverSocket.on("connect", function() {
                            serverSocket.on('error', function() {
                                clientSocket.end();
                            });
                            var msg = "HTTP/1.1 200 OK\r\n\r\n";
                            clientSocket.write(msg);
                        });
                    } else {
                        // forward modified header + data
                        serverSocket.on("connect", function() {
                            var modifiedHeader = buildHTTPHeader(requestLineComponents, optionMap);
                            serverSocket.write(modifiedHeader + extraData);
                        });
                    }
                    // Connect to Host/Port
                    serverSocket.connect(hostPort, hostName);
                }
                dns.lookup(hostName, (err, address, family) => {
                    if (err) {
                        console.log('lookup failure');
                        // some sort of 404 or could not resolve
                        clientSocket.end();
                        return;
                    }
                    connectToServer(address, hostPort);
                });
            }
        } else {
            // we have seen the header
            serverSocket.write(data);
        }
    });

});

server.on('error', (err) => {
    console.log("Server error");
    process.exit(1);
    //TODO: try broadcasting to clients that we hit an error?
})

server.listen(clientFacingPort);

function buildOptionMap(lines) {
    var options = {};
    for (lineNum in lines) {
        var optionComponents = splitHeaderOptionString(lines[lineNum], ":");

        if (optionComponents == null) { continue; }

        var key = optionComponents[0].trim().toLowerCase();
        var value = optionComponents[1].trim();

        options[key] = value;
    }
    return options;
}

function splitHeaderOptionString(s, delim) {
    var index = s.indexOf(delim);
    if (index < 0) { return null;}
    return [s.substring(0, index), s.substring(index + 1, s.length)];
}

function buildHTTPHeader(requestLineComponents, optionMap) {
    var header = "";
    header += requestLineComponents.join(" ");
    header += "\r\n";
    for (var optionKey in optionMap) {
        header += optionKey + ": " + optionMap[optionKey] + "\r\n";
    }
    header += "\r\n";
    return header;
}

// Checks in the host field and uri for a port. If no port is found, returns 80.
function determineServerPort(hostFieldComponents, requestURI) {
    var serverPort = 80;
    if (hostFieldComponents.length == 1) {
        // Port not included in host field
        var portMatches = requestURI.match(/:[0-9]{1,5}/);
        if (portMatches != null) {
            serverPort = portMatches[0];
        }
    }else{
        // Pull port from host field
        serverPort = hostFieldComponents[1];
    }
    return serverPort;
}

function logRequest(method, uri) {
    var time = new Date();
    console.log(time + " >> " + method.toUpperCase() + " " + uri);
};

const HTTP_METHODS = ["GET", "HEAD", "POST", "PUT", "DELETE", "TRACE", "CONNECT"];
