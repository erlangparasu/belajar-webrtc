// app.js

const constraints = {
    'video': false,
    'audio': true,
};

const rtcConfig = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        }
    ],
    iceCandidatePoolSize: 10,
};

// Global State
let mLocalStream = null;
let mRemoteStream = null;

const mPeerConn = new RTCPeerConnection(rtcConfig);
const mPeerConn2 = new RTCPeerConnection(rtcConfig);

let storageCallDoc = {};

let player = null;
let isProcessing = false;

/** @type MediaRecorder */
let recorder = null;
let chunks = [];
let idInterval = null;

async function initServiceWorker() {
    if ("serviceWorker" in navigator) {
        window.addEventListener("load", function () {
            navigator.serviceWorker
                .register("service-worker.js")
                .then(res => console.log("service worker registered"))
                .catch(err => console.log("service worker not registered", err));
        });
    }
}

async function callByUsername(username) {
    let mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

    mLocalStream = mediaStream;
    mRemoteStream = new MediaStream();

    mLocalStream.getTracks().forEach(function (msTrack, index) {
        console.log('mLocalStream.getTracks().forEach(function (msTrack, index) {');
        mPeerConn.addTrack(msTrack, mLocalStream);
    });

    mPeerConn.ontrack = function (event) {
        console.log('mPeerConn.ontrack = function (event) {');
        event.streams[0].getTracks().forEach(function (msTrack, index) {
            mRemoteStream.addTrack(msTrack);
        });
    };

    // $('#audioLocal')[0].srcObject = mLocalStream;
    // $('#audioRemote')[0].srcObject = mRemoteStream;

    // await makeACall();
    await storeStream(mediaStream);
}

async function storeStream(stream) {
    if (recorder != null) {
        recorder.stop();
        recorder = null;
    }

    const options = {
        mimeType: 'audio/webm;codecs="opus"',
    };
    recorder = new MediaRecorder(stream, options);
    recorder.ondataavailable = function (event) {
        chunks.push(event.data);
        // console.log(event.data);
    };

    recorder.start();
    setInterval(() => {
        recorder.stop();
        recorder.start();
    }, 3000);
}

async function makeACall() {
    console.log('makeACall:');

    // let uuid = Math.random().toString(36).substr(2, 99);
    let uuid = $('#inputMyCallId').val();

    let callData = {
        id: uuid,
        theOfferCandidates: [],
        theAnswerCandidates: [],
        theOfferSDP: null,
        theAnswerSDP: null,
    };

    $('#inputCallId').val(callData.id);

    mPeerConn.onicecandidate = function (event) {
        console.log('mPeerConn.onicecandidate = function (event) {');

        if (event.candidate) {
            callData.theOfferCandidates.push(event.candidate);

            const jsonOfferCandidate = JSON.stringify(event.candidate);
            $('#storage1').trigger('json_offer_candidate', [jsonOfferCandidate]);
        }
    }

    const newRealOffer = await mPeerConn.createOffer();
    await mPeerConn.setLocalDescription(newRealOffer);

    const offer = {
        sdp: newRealOffer.sdp,
        type: newRealOffer.type,
    };
    callData.theOfferSDP = offer;

    storageCallDoc[callData.id] = callData; // "random_id": Object

    $('#storage1').on('json_answer_sdp', async function (event, jsonAnswerSDP) {
        console.log('json_answer_sdp', jsonAnswerSDP);

        const answerSDP = JSON.parse(jsonAnswerSDP);
        try {
            await mPeerConn.setRemoteDescription(
                new RTCSessionDescription(answerSDP)
            );
        } catch (err) {
            console.error('catch:', err);
        }
    });

    $('#storage1').on('json_answer_candidate', async function (event, jsonAnswerCandidate) {
        console.log('json_answer_candidate', jsonAnswerCandidate);

        const answerCandidate = JSON.parse(jsonAnswerCandidate);
        try {
            await mPeerConn.addIceCandidate(
                new RTCIceCandidate(answerCandidate)
            );
        } catch (err) {
            console.error('catch:', err);
        }
    });
}

async function answerByCallId(callId) {
    console.log('answerByCallId:', callId);

    mRemoteStream = new MediaStream();

    mPeerConn2.ontrack = function (event) {
        console.log('mPeerConn2.ontrack');

        event.streams[0].getTracks().forEach(function (msTrack, index) {
            mRemoteStream.addTrack(msTrack);
        });
    };

    // $('#audioRemote')[0].srcObject = mRemoteStream;

    ////

    let callData = storageCallDoc[callId];

    mPeerConn2.onicecandidate = function (event) {
        console.log('mPeerConn2.onicecandidate = function (event) {');

        if (event.candidate) {
            callData.theAnswerCandidates.push(event.candidate);

            const jsonAnswerCandidate = JSON.stringify(event.candidate);
            $('#storage1').trigger('json_answer_candidate', [jsonAnswerCandidate]);
        }
    }

    await mPeerConn2.setRemoteDescription(
        new RTCSessionDescription(callData.theOfferSDP)
    );

    const newRealAnswer = await mPeerConn2.createAnswer();
    await mPeerConn2.setLocalDescription(newRealAnswer);

    const answer = {
        type: newRealAnswer.type,
        sdp: newRealAnswer.sdp,
    };
    callData.theAnswerSDP = answer;

    $('#storage1').on('json_offer_candidate', async function (event, jsonOfferCandidate) {
        console.log('json_offer_candidate', jsonOfferCandidate);

        const offerCandidate = JSON.parse(jsonOfferCandidate);
        try {
            await mPeerConn2.addIceCandidate(
                new RTCIceCandidate(offerCandidate)
            );
        } catch (err) {
            console.error('catch:', err);
        }
    });

    const jsonAnswerSDP = JSON.stringify(answer);
    $('#storage1').trigger('json_answer_sdp', [jsonAnswerSDP]);
}

$(function () {
    let uuid = Math.random().toString(36).substr(2, 99);
    $('#inputMyCallId').val(uuid);

    $('#btnCall').on('click', function () {
        const username = "user2";

        callByUsername(username).then(function success(data) {
            console.log('success', data);
        }, function error(err) {
            console.log('error', err);
            alert('error', err);
        });
    });

    $('#btnAnswer').on('click', function () {
        const callId = $('#inputCallId').val();

        answerByCallId(callId).then(function success(data) {
            console.log('success', data);
        }, function error(err) {
            console.log('error', err);
        });
    });

    /** @type HTMLMediaElement */
    player = $('#audioRemote')[0];

    player.ononabort = (event) => {
        console.log('abort');
    };
    player.ononcanplay = (event) => {
        console.log('canplay');
    };
    player.ononcanplaythrough = (event) => {
        console.log('canplaythrough');
    };
    player.ondurationchange = (event) => {
        console.log('durationchange');
    };
    player.onemptied = (event) => {
        console.log('emptied');
    };
    player.onended = (event) => {
        console.log('ended');
    };
    player.onerror = (event) => {
        console.log('error');
    };
    player.onloadeddata = (event) => {
        console.log('loadeddata');
    };
    player.onloadedmetadata = (event) => {
        console.log('loadedmetadata');
    };
    player.onloadstart = (event) => {
        console.log('loadstart');
    };
    player.onpause = (event) => {
        console.log('pause');
    };
    player.onplay = (event) => {
        console.log('play');
    };
    player.onplaying = (event) => {
        console.log('playing');
    };
    player.onprogress = (event) => {
        console.log('progress');
    };
    player.onratechange = (event) => {
        console.log('ratechange');
    };
    player.onseeked = (event) => {
        console.log('seeked ');
    };
    player.onseeking = (event) => {
        console.log('seeking');
    };
    player.onstalled = (event) => {
        console.log('stalled');
    };
    player.onsuspend = (event) => {
        console.log('suspend');
    };
    player.ontimeupdate = (event) => {
        console.log('timeupdate');
    };
    player.onvolumechange = (event) => {
        console.log('volumechange');
    };
    player.onwaiting = (event) => {
        console.log('waiting');
    };

    player.src = '';

    idInterval = setInterval(() => {
        if (null != idInterval) {
            if (null != player) {
                if ('' == player.src) {
                    isProcessing = false;
                }

                if (player.paused) {
                    isProcessing = false;
                }

                if (player.ended) {
                    isProcessing = false;
                }

                if (null != player.error) {
                    isProcessing = false;
                }
            }

            if (!isProcessing) {
                isProcessing = true;
                try {
                    runTask();
                } catch (error) {
                    // throw error;
                    console.log('catch:', error);
                }
            }
        }
    }, 2000);
});

function runTask() {
    console.log('runTask:');

    // let blob = null;
    // do {
    //     blob = chunks.shift();
    //     if (blob) {
    //         console.log('runTask: blob:', blob); // todo: post to websocket
    //     }
    // } while (blob);

    blob = chunks.shift();
    console.log('runTask: blob found', blob != undefined);

    if (blob) {
        if (null != player) {
            console.log('player not null');

            player.pause();
            player.src = window.URL.createObjectURL(blob);
            player.load();
            player.play();
        }
    }
}
