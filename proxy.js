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
    var serverSock = net.Socket();
    function closeSockets(s1, s2){
      s1.end();
      s2.end();
    }
    clientSocket.on('close', function(){
      closeSockets(clientSocket, serverSocket);
    });


    // do we need to pass as an argument
    clientSocket.on('data', function (data, serverSock) {
        if (!haveSeenEndOfHeader) {
            var dataString = data.toString('ascii');
            header.concat(dataString);

            if (header.includes('\r\n\r\n')) {
                haveSeenEndOfHeader = true;
                var headerish = header.split('\r\n\r\n');
                var lines = headerish[0].split('\r\n');

                //TODO: make sure header is valid
                var requestLine = lines.shift().trim().split('\w');
                if (requestLine.length != 3) { 
                  // invalid header
                  // discard
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
                //TODO: start DNS lookup
                var reqType = requestLine[0];
                var uri = requestLine[1];
                // may actually need host
                var serverAddr;
                if (!("host" in options)) {
                  return;
                } 
                host = options.host.split(':');
                // Could ipv6 cause there to be multiple : in host?
                hostName = host[0];
                if (host.length == 1) {
                  // Double check
                  port = uri.split('.')[1].split(':')[1].split('/')[0];
                }else{ port = host[1];}
                
                function initiateConnection() {
                  // Assign on msg based upon connection type Connect vs Get
                  // each callback should have a static definition (?)
                  serverSock.on('data', function(data) {

                  });
                  // Connect to Host/Port
                  serverSock.connect(address.port, address.host, function(err){
                    // callback
                    if (err) {
                      // send 502 bad gateway
                      // close connection
                    }
                    // send HTTP 200 to client
                    // forward modified header
                  });
                }
                dns.lookup(hostName, (err, address, family) => {
                  if (err) {
                    // some sort of 404 or could not resolve
                    clientSocket.end();
                    return;
                  }
                  serverAddr = address;
                  initiateConnection();
                  //create socket to server and connect
                });
            }
        }

        //parse/modify header
        //resolve name
        //forward data
        //forward responses
        // if haveSeenHeader:
        // forward data until one end closes connection
        // how to close serverSock if clientSocket initiates close?
        // redefine "on close" within the first on data
        // potential cyclic close calls
    });

});

server.on('error', (err) => {
    console.log("Server error");
    process.exit(1);
    //TODO: try broadcasting to clients that we hit an error?
})

server.listen(port);
