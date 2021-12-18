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

    $('#audioRemote')[0].srcObject = mRemoteStream;

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
    $('#btnCall').on('click', function () {
        const username = "user2";

        callByUsername(username).then(function success(data) {
            console.log('success', data);
        }, function error(err) {
            console.log('error', err);
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
});
