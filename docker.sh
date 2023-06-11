set -e
docker build --platform=linux/amd64 -t tonwhales/ton-api-v4:v43 .
# docker tag tonwhales/ton-api-v4:v43 orbsnetwork/ton-api-v4:v43
# docker push orbsnetwork/ton-api-v4:v43

# https://mainnet-v4.tonhubapi.com/block/utime/1680031682

# https://mainnet-v4.tonhubapi.com/block/utime/1680031682