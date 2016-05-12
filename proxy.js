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
    // Should create server socket here to avoid delay on data
    var serverSocket = net.Socket();

    clientSocket.on('end', function() {
      serverSocket.end();
    });
    serverSocket.on('end', function() {
      clientSocket.end();
    });
    serverSocket.on('error', function(err) {
      // close connection
      serverSocket.end();
      clientSocket.end();
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
            header.concat(dataString);

            if (header.includes('\r\n\r\n')) {
                haveSeenEndOfHeader = true;
                // this is the split between header and appended data
                var headerish = header.split('\r\n\r\n');
                // these are the lines of the actual header
                var lines = headerish[0].split('\r\n');

                //TODO: make sure header is valid
                var requestLine = lines.shift().trim().split(/\s+/).toLowerCase();
                if (requestLine.length == 3) { 
                  // invalid header
                  if (requestLine[2] != "HTTP/1.1"){
                    // invalid
                    clientSocket.end();
                    return
                  }
                  if (requestLine[0] != "connect" && requestLine[0] != "get"){
                    client.Socket.end();
                    return;
                  }
                } else {
                  clientSocket.end();
                  return;
                }
                var options = {};
                for (option in lines) {
                    function splitOption(s) {
                      index = s.indexOf(':');
                      if (index < 0 && (index + 1) < s.length) { return null;}
                      return [s.substring(0, index), s.substring(index + 1, s.length)];
                    } 
                    var optionFields = splitOptions(option);
                    if (optionFields == null) { continue; }
                    options[optionFields[0].trim().toLowerCase()] = optionFields[1].trim();
                }
                var reqType = requestLine[0];
                var uri = requestLine[1];
                // may actually need host
                var serverAddr;
                if (!("host" in options)) {
                  clientSocket.end();
                  return;
                } 
                host = options.host.split(':');
                // Could ipv6 cause there to be multiple : in host?
                //TODO: check for index out of bounds errors
                hostName = host[0];
                if (host.length == 1) {
                  // Double check
                  port = uri.split('.')[1].split(':')[1].split('/')[0];
                }else{ port = host[1];}
                
                function initiateConnection(hostname, port) {
                  // Assign on msg based upon connection type Connect vs Get
                  // each callback should have a static definition (?)
                  if (reqType == "connect") {
                    serverSocket.on("error", function() {
                      // send 502 bad gateway
                      //TODO: build message
                      msg = null;
                      clientSocket.write(msg, function() {
                        clientSocket.end();
                      });
                    });
                    serverSocket.on("connect", function() {
                      serverSocket.on('error', function() {
                        clientSocket.end();
                      });
                      // send 200
                      //TODO: build message
                      msg = null;
                      clientSocket.send(msg);
                    });
                  } else if(reqType == "get") {
                    // forward modified header + data
                    serverSocket.on("connect", function() {
                      serverSocket.write(header);
                    });
                  }
                  // Note: Do we downgrade to 1.0 for both GET and CONNECT requests?
                  // Connect to Host/Port
                  serverSocket.connect(port, hostname);
                }
                dns.lookup(hostName, (err, address, family) => {
                  if (err) {
                    // some sort of 404 or could not resolve
                    clientSocket.end();
                    return;
                  }
                  serverAddr = address;
                  initiateConnection(serverAddr.hostname, port);
                  //create socket to server and connect
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

server.listen(port);
