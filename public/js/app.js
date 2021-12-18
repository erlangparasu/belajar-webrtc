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

let storageCallDoc = {};
let tmpLocalCandidates = [];

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

    $('#audioLocal')[0].srcObject = mLocalStream;
    $('#audioRemote')[0].srcObject = mRemoteStream;

    await makeACall();
}

async function makeACall() {
    console.log('makeACall:');

    const uuid = Math.random().toString(36).substr(2, 99);

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

            let jsonOfferCandidate = JSON.stringify(event.candidate)
            $('#storage1').trigger('json_offer_candidate', [jsonOfferCandidate]);
        }
    }

    let offerSDP = await mPeerConn.createOffer();
    await mPeerConn.setLocalDescription(offerSDP);

    const offer = {
        sdp: offerSDP.sdp,
        type: offerSDP.type,
    };
    callData.theOfferSDP = offer;

    storageCallDoc[callData.id] = callData; // "random_id": Object

    $('#storage1').on('json_answer_sdp', async function (event, jsonAnswerSDP) {
        console.log('json_answer_sdp', callId, jsonAnswerSDP);

        let answerSDP = JSON.parse(jsonAnswerSDP);
        try {
            await mPeerConn.setRemoteDescription(
                new RTCSessionDescription(answerSDP)
            ); // TODO: ??? await?
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

    $('#audioLocal')[0].srcObject = mLocalStream;
    $('#audioRemote')[0].srcObject = mRemoteStream;

    // await asdf();
}

function listenForAnswerSDP(callback) {
    let intervalId = null;
    intervalId = setInterval(function () {
        if (intervalId != null) {
            if (storageAnswerSDP != null) {
                console.log('if (storageAnswerSDP != null) {');

                let data = {
                    answer: JSON.parse(storageAnswerSDP)
                };
                callback(data);

                storageAnswerSDP = null;
            }
        }
    }, 1000 * 10);
}

function listenForAnswerCandidate(callback) {
    let intervalId = null;
    intervalId = setInterval(function () {
        if (intervalId != null) {
            storageCandidates.forEach(function (storageCandidate) {
                let isNew = true;
                tmpLocalCandidates.forEach(function (localCandidate) {
                    if (storageCandidate == localCandidate) {
                        isNew = false;
                    }
                });

                if (isNew) {
                    console.log('isNew candidate');

                    tmpLocalCandidates.push(storageCandidate);

                    let data = {
                        candidate: JSON.parse(
                            JSON.stringify(storageCandidate)
                        )
                    };
                    callback(data);
                }
            });
        }
    }, 1000 * 10);
}

$(function () {
    $('#btnCall').on('click', function () {
        let username = "user2";

        callByUsername(username).then(function success(data) {
            console.log('success', data);
        }, function error(err) {
            console.log('error', err);
        });
    });

    $('#btnAnswer').on('click', function () {
        let  = $('#inputCallId').val();

        answerByCallId(callId).then(function success(data) {
            console.log('success', data);
        }, function error(err) {
            console.log('error', err);
        });
    });
});
