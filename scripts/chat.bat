setlocal
@ECHO OFF
set NODE_PATH=dist-examples/src;dist-examples/examples/chat
@ECHO ON

node ./dist-examples/examples/chat/index.js

endlocal