let stream = new MediaStream();

let suuid = $('#suuid').val();

let config = {
  iceServers: [{
    urls: ["stun:stun.l.google.com:19302"]
  }]
};

const pc = new RTCPeerConnection(config);
pc.onnegotiationneeded = handleNegotiationNeededEvent;

let log = msg => {
  document.getElementById('div').innerHTML += msg + '<br>'
}

pc.ontrack = function(event) {
  stream.addTrack(event.track);
  videoElem.srcObject = stream;
  log(event.streams.length + ' track is delivered')
}

pc.oniceconnectionstatechange = e => log(pc.iceConnectionState)

async function handleNegotiationNeededEvent() {
  let offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  getRemoteSdp();
}

$(document).ready(function() {
  $('#' + suuid).addClass('active');
  getCodecInfo();
});



$('.floorLink').click(function(event) {
  event.preventDefault(); // Mencegah tindakan default dari link
  // var floor = $(this).text(); // Mendapatkan teks dari tag <a> yang diklik
  var floor = $(this).attr('href'); // Mendapatkan teks dari tag <a> yang diklik
  // console.log(floor);
  getCategories(floor); // Memanggil fungsi getCategories dengan argumen teks yang didapat
});

function getCategories(floor){
  $.get("../category/" + floor, function(data) {
    try {
      // data = JSON.stringify(data);
      // console.log(data);
      var $categoryList = $('#categoryList');
      $categoryList.empty(); 
      data.forEach(function(camera) {
        // console.log(camera);
        $categoryList.append(`<a href={camera} id={camera} name={camera} class="list-group-item list-group-item-action">` + camera + '</a>');
      });
    } catch (e) {
      console.log(e);
    }
  });
}


function getCodecInfo() {
  $.get("../codec/" + suuid, function(data) {
    try {
      data = JSON.parse(data);
    } catch (e) {
      console.log(e);
    } finally {
      $.each(data,function(index,value){
        pc.addTransceiver(value.Type, {
          'direction': 'sendrecv'
        })
      })
      //send ping becouse PION not handle RTCSessionDescription.close()
      sendChannel = pc.createDataChannel('foo');
      sendChannel.onclose = () => console.log('sendChannel has closed');
      sendChannel.onopen = () => {
        console.log('sendChannel has opened');
        sendChannel.send('ping');
        setInterval(() => {
          sendChannel.send('ping');
        }, 1000)
      }
      sendChannel.onmessage = e => log(`Message from DataChannel '${sendChannel.label}' payload '${e.data}'`);
    }
  });
}

let sendChannel = null;

function getRemoteSdp() {
  $.post("../receiver/"+ suuid, {
    suuid: suuid,
    data: btoa(pc.localDescription.sdp)
  }, function(data) {
    try {
      pc.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: atob(data)
      }))
    } catch (e) {
      console.warn(e);
    }
  });
}