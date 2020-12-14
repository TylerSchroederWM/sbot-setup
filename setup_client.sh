#!/bin/bash

if ["$EUID" -ne 0]; then
  echo "Script must be run with sudo."
  exit
fi

apt update
apt install npm
npm install -g ssb-server

cd "{$BASH_SOURCE/*}/"
cat > run_client.sh <<EOF
#!/bin/bash

if ["$EUID" -ne 0]; then
  echo "Script must be run with sudo."
  exit
fi

ssb-server start --blobs.sympathy=0 --blobs.max=0
EOF

chmod 744 run_client.sh

echo "Setup complete!"
echo "To run the client in the future, execute 'sudo ./run_client.sh' in this directory."
echo "(note: this process will monopolize your terminal)"