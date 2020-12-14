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
  }
  "blobs": {
    "sympathy": 0,
    "max": 0
  }
}
EOF

cd "${BASH_SOURCE%/*}/"
cat > runserver.sh <<EOF
#!/bin/bash

if [ "$EUID" -ne 0 ]; then
  echo "Script must be run with sudo."
  exit
fi

while true; do
  ssb-server start --host routableAddr
done
EOF

chmod 744 runserver.sh

echo "Setup complete!"
echo "To run the server, execute 'sudo ./runserver.sh' in this file's directory."
echo "(note: this process will monopolize your terminal)"
