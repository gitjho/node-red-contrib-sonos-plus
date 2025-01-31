var SonosHelper = require('./SonosHelper.js');
var helper = new SonosHelper();

module.exports = function (RED) {
  'use strict';

  function SonosManageQueueNode (config) {
    /**  Create Manage Queue Node and subscribe to messages
    * @param  {object} config current node configuration data
    */

    RED.nodes.createNode(this, config);

    // verify config node. if valid then set status and subscribe to messages
    var node = this;
    var configNode = RED.nodes.getNode(config.confignode);
    var isValid = helper.validateConfigNodeV3(configNode);
    if (isValid) {
      // clear node status
      node.status({});
      // subscribe and handle input message
      node.on('input', function (msg) {
        node.debug('node on - msg received');
        // check again configNode - in the meantime it might have changed
        var isStillValid = helper.validateConfigNodeV3(configNode);
        if (isStillValid) {
          helper.identifyPlayerProcessInputMsg(node, configNode, msg, function (ipAddress) {
            if (ipAddress === undefined || ipAddress === null) {
            // error handling node status, node error is done in identifyPlayerProcessInputMsg
            } else {
              node.debug('Found sonos player');
              handleInputMsg(node, msg, ipAddress);
            }
          });
        } else {
          node.status({ fill: 'red', shape: 'dot', text: 'error:process message - invalid configNode' });
          node.error('process message - invalid configNode. Please modify!');
        }
      });
    } else {
      node.status({ fill: 'red', shape: 'dot', text: 'error:setup subscribe - invalid configNode' });
      node.error('setup subscribe - invalid configNode. Please modify!');
    }
  }

  // -------------------------------------------------------------------------

  function handleInputMsg (node, msg, ipaddress) {
    /**  Validate sonos player and input message then dispatch
    * @param  {Object} node current node
    * @param  {object} msg incoming message
    * @param  {string} ipaddress IP address of sonos player
    */

    // get sonos player
    const { Sonos } = require('sonos');
    const sonosPlayer = new Sonos(ipaddress);
    if (sonosPlayer === null || sonosPlayer === undefined) {
      node.status({ fill: 'red', shape: 'dot', text: 'error:get sonosplayer - sonos player is null.' });
      node.error('get sonosplayer - sonos player is null. Details: Check configuration.');
      return;
    }

    // Check msg.payload. Store lowercase version in command
    if (!(msg.payload !== null && msg.payload !== undefined && msg.payload)) {
      node.status({ fill: 'red', shape: 'dot', text: 'error:validate payload - invalid payload.' });
      node.error('validate payload - invalid payload. Details: ' + JSON.stringify(msg.payload));
      return;
    }
    var command = msg.payload;
    command = '' + command;// convert to string
    command = command.toLowerCase();

    // dispatch
    if (command === 'activate_queue') {
      activateQueue(node, msg, sonosPlayer);
    } else if (command === 'play_song') {
      // TODO check queue activated
      playTrack(node, msg, sonosPlayer, msg.topic);
    } else if (command === 'insert_uri') {
      // TODO check queue activated
      insertUri(node, msg, sonosPlayer, msg.topic);
    } else if (command === 'flush_queue') {
      sonosPlayer.flush().then(result => {
        node.status({ fill: 'green', shape: 'dot', text: 'OK- flush queue' });
        node.debug('OK- flush queue');
        node.send(msg);
      }).catch(err => {
        node.status({ fill: 'red', shape: 'dot', text: 'error:flush queue' });
        node.error('flush queue - Could not flush Details: ' + JSON.stringify(err));
      });
    } else if (command === 'get_queue') {
      getQueue(node, msg, sonosPlayer);
    } else if (command === 'get_sonos_playlists') {
      getSonosPlaylists(node, msg, sonosPlayer);
    } else if (command === 'get_amazon_playlists') {
      getMySonosAmazonPrimePlaylists(node, msg, sonosPlayer);
    } else {
      node.status({ fill: 'green', shape: 'dot', text: 'warning:depatching commands - invalid command' });
      node.warn('depatching commands - invalid command. Details: command -> ' + JSON.stringify(command));
    }
  }

  // ------------------------------------------------------------------------------------

  function activateQueue (node, msg, sonosPlayer) {
    // TODO ensure not empty
    var sonosFunction = 'activate queue';
    var errorShort = '';
    sonosPlayer.selectQueue().then(response => {
      node.status({ fill: 'green', shape: 'dot', text: `ok:${sonosFunction}` });
      node.debug(`ok:${sonosFunction}`);
      node.send(msg);
    }).catch(err => {
      errorShort = 'error caught from response';
      node.status({ fill: 'red', shape: 'dot', text: `error:${sonosFunction} - ${errorShort}` });
      node.error(`${sonosFunction} - ${errorShort} Details: ` + JSON.stringify(err));
    });
  }

  function playTrack (node, msg, sonosPlayer, topic) {
    // TODO Ensure there is next and queue not empty
    // TODO error handling
    var sonosFunction = 'play song';
    var errorShort = '';
    var i = parseInt(topic);
    sonosPlayer.selectTrack(i).then(response => {
      node.status({ fill: 'green', shape: 'dot', text: `ok:${sonosFunction}` });
      node.debug(`ok:${sonosFunction}`);
      node.send(msg);
    }).catch(err => {
      errorShort = 'error caught from response';
      node.status({ fill: 'red', shape: 'dot', text: `error:${sonosFunction} - ${errorShort}` });
      node.error(`${sonosFunction} - ${errorShort} Details: ` + JSON.stringify(err));
    });
  }

  function insertUri (node, msg, sonosPlayer, uri) {
    // TODO STILL IN TEST
    var sonosFunction = 'insert uri';
    var errorShort = '';
    sonosPlayer.queue(uri).then(response => {
      node.status({ fill: 'green', shape: 'dot', text: `ok:${sonosFunction}` });
      node.debug(`ok:${sonosFunction}`);
      node.send(msg);
    }).catch(err => {
      errorShort = 'error caught from response';
      node.status({ fill: 'red', shape: 'dot', text: `error:${sonosFunction} - ${errorShort}` });
      node.error(`${sonosFunction} - ${errorShort} Details: ` + JSON.stringify(err));
    });
  }

  function getQueue (node, msg, sonosPlayer) {
    var sonosFunction = 'get queue';
    var errorShort = 'invalid response received';
    sonosPlayer.getQueue().then(response => {
      if (response === null || response === undefined) {
        node.status({ fill: 'red', shape: 'dot', text: `error:${sonosFunction} - ${errorShort}` });
        node.error(`${sonosFunction} - ${errorShort}`);
        return;
      }
      var songsArray;
      var queueSize;
      if (response === false) {
        // queue is empty
        queueSize = 0;
        songsArray = [];
        errorShort = 'queue is empty!';
      } else {
        node.debug(JSON.stringify(response));
        queueSize = parseInt(response.returned);
        songsArray = response.items;
        errorShort = `queue contains ${queueSize} songs`;
        // message albumArtURL
        songsArray.forEach(function (songsArray) {
          if (songsArray.albumArtURL !== undefined && songsArray.albumArtURL !== null) {
            var port = 1400;
            songsArray.albumArtURI = songsArray.albumArtURL;
            songsArray.albumArtURL = 'http://' + sonosPlayer.host + ':' + port + songsArray.albumArtURI;
          }
        });
      }
      node.status({ fill: 'green', shape: 'dot', text: `ok:${sonosFunction} - queue size is ${queueSize}` });
      node.debug(`ok:${sonosFunction} - queue size is ${queueSize}`);
      // send message data
      msg.payload = songsArray;
      msg.queue_length = queueSize;
      node.send(msg);
    }).catch(err => {
      errorShort = 'error caught from response';
      node.status({ fill: 'red', shape: 'dot', text: `error:${sonosFunction} - ${errorShort}` });
      node.error(`${sonosFunction} - ${errorShort} Details: ` + JSON.stringify(err));
    });
  }

  function getSonosPlaylists (node, msg, sonosPlayer) {
    var sonosFunction = 'get SONOS playlists';
    var msgShort = '';
    sonosPlayer.getMusicLibrary('sonos_playlists', { start: 0, total: 50 }).then(response => {
      if (response === null || response === undefined) {
        node.status({ fill: 'red', shape: 'dot', text: `error:${sonosFunction} - ${msgShort}` });
        node.error(`${sonosFunction} - ${msgShort}`);
        return;
      }
      var playlistArray;
      var numberOfPlaylists;
      if (response === false) {
        // no playlist
        numberOfPlaylists = 0;
        playlistArray = [];
        msgShort = 'No SONOS playlists found!';
      } else {
        numberOfPlaylists = parseInt(response.total);
        playlistArray = response.items;
        msgShort = `found ${numberOfPlaylists} SONOS playlists`;
        // message albumArtURL
        playlistArray.forEach(function (songsArray) {
          if (songsArray.albumArtURL !== undefined && songsArray.albumArtURL !== null) {
            var port = 1400;
            songsArray.albumArtURI = songsArray.albumArtURL;
            songsArray.albumArtURL = 'http://' + sonosPlayer.host + ':' + port + songsArray.albumArtURI;
          }
        });

        node.status({ fill: 'green', shape: 'dot', text: `ok:${sonosFunction} - ${msgShort}` });
        node.debug(`ok:${sonosFunction} - ${msgShort}`);
        // send message data
        msg.payload = playlistArray;
        msg.available_playlists = numberOfPlaylists;
        node.send(msg);
      }
    }).catch(err => {
      msgShort = 'error caught from response';
      node.status({ fill: 'red', shape: 'dot', text: `error:${sonosFunction} - ${msgShort}` });
      node.error(`${sonosFunction} - ${msgShort} Details: ` + JSON.stringify(err));
    });
  }

  function getMySonosAmazonPrimePlaylists (node, msg, sonosPlayer) {
    /**  Get list of My Sonos Amazon Playlist (only standards)
    * @param  {Object} node current node
    * @param  {object} msg incoming message
    * @param  {object} sonosPlayer Sonos Player
    * change msg.payload to current array of My Sonos Amazon Prime playlist
    */

    // get list of My Sonos items
    let sonosFunction = 'get amazon prime playlist';
    let errorShort = 'invalid or empty My Sonos list received';
    sonosPlayer.getFavorites().then(response => {
      if (!(response.returned !== null && response.returned !== undefined &&
          response.returned && parseInt(response.returned) > 0)) {
        node.status({ fill: 'red', shape: 'dot', text: `error:${sonosFunction} - ${errorShort}` });
        node.error(`${sonosFunction} - ${errorShort} Details: response->` + JSON.stringify(response));
        return;
      }
      // filter: Amazon Prime Playlists only
      const PRIME_IDENTIFIER = 'prime_playlist';
      let primePlaylistList = []; // will hold all playlist items
      let primePlaylistUri = '';
      for (let i = 0; i < parseInt(response.returned); i++) {
        primePlaylistUri = response.items[i].uri;
        if (primePlaylistUri.indexOf(PRIME_IDENTIFIER) > 0) {
          // found prime playlist
          primePlaylistUri = response.items[i].uri;
          primePlaylistList.push({ 'title': response.items[i].title, 'uri': primePlaylistUri });
        }
      }
      if (primePlaylistList.length === 0) {
        errorShort = 'no amazon prime playlist in my sonos';
        node.status({ fill: 'red', shape: 'dot', text: `error:${sonosFunction} - ${errorShort}` });
        node.error(`${sonosFunction} - ${errorShort} Details: mysonos->` + JSON.stringify(response.items));
        return;
      }
      node.status({ fill: 'green', shape: 'dot', text: `ok:${sonosFunction}` });
      node.debug(`ok:${sonosFunction}`);
      msg.payload = primePlaylistList;
      node.send(msg);
    }).catch(err => {
      errorShort = 'error caught from response';
      node.status({ fill: 'red', shape: 'dot', text: `error:${sonosFunction} - ${errorShort}` });
      node.error(`${sonosFunction} - ${errorShort} Details: ` + JSON.stringify(err));
    });
  }
  RED.nodes.registerType('sonos-manage-queue', SonosManageQueueNode);
};
