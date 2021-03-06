#!/bin/bash

if [ "$EUID" -ne 0 ]; then
  echo "Script must be run with sudo."
  exit
fi

read -p 'Please enter your routable IP address or hostname: ' routableAddr

apt update
apt install npm
npm install -g ssb-server

mkdir -p ~/.ssb
cat > ~/.ssb/config <<EOF
{
  "connections": {
    "incoming": {
      "net": [
        {
          "scope": "public",
          "host": "0.0.0.0",
          "external": ["$routableAddr"],
          "transform": "shs",
          "port": 8008
        }
      ]
    },
    "outgoing": {
      "net": [
        {
          "transform": "shs"
        }
      ]
    }
  },
  "blobs": {
    "sympathy": 1
  }
}
EOF

cd "${BASH_SOURCE%/*}/"
echo '#!/bin/bash

if [ "$EUID" -ne 0 ]; then
  echo "Script must be run with sudo."
  exit
fi

while true; do
  ssb-server start --host routableAddr
done' > run_server.sh

chmod 744 run_server.sh

echo "Setup complete!"
echo "To run the server, execute 'sudo ./run_server.sh' in this file's directory."
echo "(note: this process will monopolize your terminal)"
