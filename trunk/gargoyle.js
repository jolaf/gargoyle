//
// JavaScript code file for Gargoyle
//
var WELCOME = 'Welcome';
var GRANTED = ['Granted1', 'Granted2', 'Granted3', 'Granted4', 'Granted5'];
var DENIED = ['Denied1', 'Denied2', 'Denied3', 'Denied4', 'Denied5', 'Denied6'];

var AUDIO_TYPES = {'audio/mpeg': 'mp3', 'audio/ogg': 'ogg'};

var BACKSPACE = 8;
var ENTER = 13;
var ESCAPE = 27;

var CONTROL_KEYS = [BACKSPACE, ENTER, ESCAPE];

var DT = 100;
var QUESTION_TIMEOUT = 60 * 1000; // 1 minute

function debug(message) {
    var date = new Date().toTimeString().split(' ')[0];
    logger.innerHTML += date + '&nbsp;&nbsp;' + message + '<br>';
    logger.scrollTop = logger.scrollHeight;
    if (console) {
        console.log(date + ' ' + message);
    }
}

function createL2CMap() {
    var lat = 'qwertyuiopasdfghjklzxcvbnm';
    var cyr = 'йцукенгшщзфывапролдячсмить';
    var s1 = '[];\',.`ё';
    var s2 = '{}:"<>~Ё';
    var sc = 'хъжэбюее';
    var map = {};
    for (var i in lat) {
        map[lat[i].charCodeAt(0)] = cyr[i];
        map[lat[i].toUpperCase().charCodeAt(0)] = cyr[i];
    }
    for (var i in sc) {
        map[s1[i].charCodeAt(0)] = sc[i];
        map[s2[i].charCodeAt(0)] = sc[i];
    }
    return map;
}

function createProperKeyCodes() {
    ret = CONTROL_KEYS.concat([59 /*ж*/, 186 /*ж*/, 188 /*б*/, 190 /*ю*/, 192 /*ё*/, 219 /*х*/, 221 /*ъ*/, 222 /*э*/]);
    for (var i = 65; i <= 90; i++) {
        ret.push(i);
    }
    return ret;
}

function show(block) {
    block.className = 'visible';
}

function hide(block) {
    block.className = 'invisible';
}

function prevent(e) {
    e = e || window.event;
    if (e) {
        if (e.preventDefault !== undefined) {
            e.preventDefault();
        }
        if (e.stopPropagation !== undefined) {
            e.stopPropagation();
        }
        if (e.returnValue !== undefined) {
            e.returnValue = false;
        }
    }
    return false;
}

function focus(e) {
    question.focus();
    resetQuestionTimeout(true);
    return prevent(e);
}

function delay(what) {
    return setTimeout(what, DT);
}

function resetQuestionTimeout(reset) {
    clearTimeout(questionTimeout);
    questionTimeout = reset ? setTimeout(idle, QUESTION_TIMEOUT) : null;
}

function createAudio(name) {
    var audio = document.createElement('audio');
    audio.src = 'audio/' + name + '.' + audioType;
    if (isDesktopBrowser) {
        audio.volume = 0;
        audio.play();
    } else { // can't control volume on mobiles
        audio.load();
    }
    return audio;
}

function playAudio(audio, what, volume) {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = volume ? volume : 1;
        audio.play();
        audio.addEventListener('ended', what, false);
    } else {
        what();
    }
}

function main() {
    // HTML references
    body = document.getElementsByTagName('body')[0];
    body.removeAttribute('onload'); // don't even try to work after saving modified page
    startupBlock = document.getElementById('startupBlockID');
    loadingProgress = document.getElementById('loadingProgressID');
    logger = document.getElementById('loggerID');
    workingBlock = document.getElementById('workingBlockID');
    questionBlock = document.getElementById('questionBlockID');
    question = document.getElementById('questionID');
    // Setting up audio
    isDesktopBrowser = navigator.userAgent.search(/(ipad)|(iphone)|(ipod)|(android)|(webos)|(mobi)|(mini)/i) < 0;
    properlyLoaded = HTMLMediaElement.HAVE_CURRENT_DATA; // (!isDesktopBrowser && window.opera) ? HTMLMediaElement.HAVE_CURRENT_DATA : HTMLMediaElement.HAVE_ENOUGH_DATA;
    audioType = null;
    var audio = document.createElement('audio');
    for (var type in AUDIO_TYPES) {
        if (audio.canPlayType(type)) {
            audioType = AUDIO_TYPES[type];
            break;
        }
    }
    if (audioType) {
        debug('Supported audio: ' + audioType.toUpperCase());
     } else {
        debug('Audio not supported, aborting');
        return;
    }
    // Loading riddles
    welcome = createAudio(WELCOME);
    medias = [[welcome]];
    granted = [];
    for (var i = 0, g; g = GRANTED[i++];) {
        var a = createAudio(g);
        granted.push(a);
        medias.push([a]);
    }
    denied = [];
    for (var i = 0, g; g = DENIED[i++];) {
        var a = createAudio(g);
        denied.push(a);
        medias.push([a]);
    }
    for (var i = 0, riddle; riddle = RIDDLES[i++];) {
        riddle[0] = createAudio(riddle[0]);
        var answers = riddle[1] = riddle[1].split(' ');
        var maxLength = 0;
        for (var j in answers) {
             answers[j] = answers[j].toLowerCase().trim();
             maxLength = Math.max(maxLength, answers[j].length);
        }
        riddle.push(maxLength);
        medias.push(riddle);
    }
    // Wait for audio to load
    errors = 0;
    delay(waitForMedia);
}

function waitForMedia(media) {
    var ready = true;
    var loadedMedia = 0;
    var totalMedia = 0;
    for (var i = 0, riddle; riddle = medias[i++];) {
        totalMedia++;
        var audio = riddle[0];
        if (audio && audio.readyState < properlyLoaded) {
            ready = false;
            if (audio.error) {
                debug('ERROR loading audio from ' + audio.src);
                errors++;
                riddle[0] = null;
            }
        } else {
            loadedMedia++;
        }
    }
    if (totalMedia) {
        loadingProgress.innerHTML = 'Gargoyle loading audio... ' + loadedMedia + ' of ' + totalMedia + ' (' + Math.round(loadedMedia * 100 / totalMedia) + '%' + ')';
    }
    if (ready) {
        // Complete the application startup
        if (errors === totalMedia) {
            debug('No audio loaded successfully, aborting');
            return;
        }
        if (errors) {
            startupBlock.onmousedown = start;
            debug(errors + ' errors found, click to continue');
        } else {
            setTimeout(start, 200); // needs to be investigated
        }
    } else {
        delay(waitForMedia);
    }
}

function start(e) {
    busy = null;
    answers =  null;
    questionTimeout = null;
    riddles = [];
    welcome = medias[0][0];
    granted = [];
    for (var i = 0; i < GRANTED.length; i++) {
        var m = medias[i + 1][0];
        if (m) {
            granted.push(m);
        }
    }
    denied = [];
    for (var i = 0; i < DENIED.length; i++) {
        var m = medias[i + 1 + GRANTED.length][0];
        if (m) {
            denied.push(m);
        }
    }
    question.onmousedown = focus;
    question.onmouseup = focus;
    question.onkeydown = keyDownHandler;
    question.onkeypress = keyPressHandler;
    workingBlock.tabIndex = 0; // to enable keypress
    latinToCyrillic = createL2CMap();
    properKeyCodes = createProperKeyCodes();
    hide(startupBlock);
    show(workingBlock);
    playAudio(welcome, idle);
    workingBlock.onkeydown = tap;
    body.oncontextmenu = prevent;
    return prevent(e);
}

function idle(e) {
    resetQuestionTimeout();
    hide(questionBlock);
    busy = false;
    workingBlock.onmousedown = tap;
    workingBlock.focus();
    return prevent(e);
}

function tap(e) {
    e = e || window.event;
    if (e && (e.altKey || e.ctrlKey || e.metaKey)) {
        return prevent(e);
    }
    if (busy) {
        return true;
    }
    busy = true;
    if (!answers) { // change riddle if it was answered
        if (!riddles.length) {
            for (var i = 0, riddle; riddle = RIDDLES[i++];) {
                if (riddle[0]) {
                    riddles.push(riddle);
                }
            }
        }
        var riddle = riddles.splice(Math.floor(Math.random() * riddles.length), 1)[0];
        audio = riddle[0];
        answers = riddle[1];
        maxAnswerLength = riddle[2];
    }
    playAudio(audio, ask);
    return true;
}

function ask() {
    question.maxLength = maxAnswerLength;
    question.value = '';
    show(questionBlock);
    focus();
    workingBlock.onmousedown = focus;
}

function keyDownHandler(e) {
    resetQuestionTimeout(true);
    e = e || window.event;
    var keyCode = e.keyCode;
    if (properKeyCodes.indexOf(keyCode) < 0 || e.ctrlKey || e.altKey || e.metaKey) {
        return prevent(e);
    }
    if (CONTROL_KEYS.indexOf(keyCode) >= 0) {
        if (!e.shiftKey) {
            switch(e.keyCode) {
            case BACKSPACE:
                question.value = question.value.substring(0, question.value.length - 1);
                break;
            case ENTER: // submit
                resetQuestionTimeout();
                workingBlock.focus();
                hide(questionBlock);
                if (answers.indexOf(question.value.toLowerCase()) >= 0) {
                    answers = null;
                    playAudio(granted[Math.floor(Math.random() * granted.length)], idle);
                } else if (question.value) {
                    playAudio(denied[Math.floor(Math.random() * denied.length)], idle);
                } else {
                    delay(idle); // avoid repeated keypress
                }
                break;
            case ESCAPE:
                delay(idle); // avoid repeated keypress
                break;
            }
        }
        return prevent(e);
    }
    return true;
}

function keyPressHandler(e) {
    e = e || window.event;
    if (!e.altKey && !e.ctrlKey && !e.metaKey) {
        if (question.value.length < question.maxLength) {
            if (e.charCode >= 'А'.charCodeAt(0) && e.charCode <= 'я'.charCodeAt(0)) {
                question.value += String.fromCharCode(e.charCode);
            } else if (c = latinToCyrillic[e.charCode]) {
                question.value += c; // map latins to cyrillic
            }
        }
    }
    return prevent(e);
}
