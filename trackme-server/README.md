##Install

- Python3
- Run `python3 -m venv trackme_server`
- run `source trackme_server/bin/activate`
- install sources from pip `pip install -r deps.txt`

guide from: https://github.com/alwaysai/video-streamer

Ran into tty port Error
- linux uses `/dev/ttyUSB*` to name items rather than `COM*`
- post that fixes errno13: https://stackoverflow.com/questions/27858041/oserror-errno-13-permission-denied-dev-ttyacm0-using-pyserial-from-pyth
