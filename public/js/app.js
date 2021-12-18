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

    await asdf();
}

let storageCandidates = [];
let storageCallDoc = {};
let storageAnswerSDP = null; // json string

async function asdf() {
    console.log('asdf:');

    mPeerConn.onicecandidate = function (event) {
        console.log('mPeerConn.onicecandidate = function (event) {');

        if (event.candidate) {
            storageCandidates.push(event.candidate);
        }
    }

    let offerSDP = await mPeerConn.createOffer();
    await mPeerConn.setLocalDescription(offerSDP);

    const offer = {
        sdp: offerSDP.sdp,
        type: offerSDP.type,
    };
    storageCallDoc = offer;

    listenForAnswerSDP(function (data) {
        console.log('listenForAnswerSDP(function (data) {');

        if (data.answer) {
            const answerSDP = new RTCSessionDescription(data.answer);
            mPeerConn.setRemoteDescription(answerSDP);
        }
    });

    listenForAnswerCandidate(function (data) {
        console.log('listenForAnswerCandidate(function (data) {');

        const candidate = new RTCIceCandidate(data.candidate);
        mPeerConn.addIceCandidate(candidate);
    });
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
    }, 2000);
}

let tmpLocalCandidates = [];
function listenForAnswerCandidate(callback) {
    let intervalId = null;
    intervalId = setInterval(function () {
        if (intervalId != null) {
            storageCandidates.forEach(function (storageCandidate) {
                tmpLocalCandidates.forEach(function (localCandidate) {
                    if (storageCandidate != localCandidate) {
                        console.log('if (storageCandidate != localCandidate) {');

                        tmpLocalCandidates.push(storageCandidate);

                        let data = {
                            candidate: JSON.parse(
                                JSON.stringify(candidate)
                            )
                        };
                        callback(data);
                    }
                });
            });
        }
    }, 2000);
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
});
