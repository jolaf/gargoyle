var WELCOME = 'Welcome';
var GRANTED = 'Granted';
var DENIED = 'Denied';

var AUDIO_TYPES = {'audio/mpeg': 'mp3', 'audio/ogg': 'ogg'};

var BACKSPACE = 8;
var ENTER = 13;
var ESCAPE = 27;

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
    ret = [BACKSPACE, ENTER, ESCAPE];
    for (var i = 65; i <=90; i++) {
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

function focus(e) {
    question.focus();
    prevent(e);
}

function prevent(e) {
    e = e || window.event;
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
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

function playAudio(audio, what) {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 1;
        audio.play();
        audio.addEventListener('ended', what, false);
    } else {
        what();
    }
}

function main() {
    // HTML references
    body = document.getElementsByTagName('body')[0];
    body.removeAttribute('onload'); // Don't even try to work after saving modified page
    startupBlock = document.getElementById('startupBlockID');
    loadingProgress = document.getElementById('loadingProgressID');
    logger = document.getElementById('loggerID');
    workingBlock = document.getElementById('workingBlockID');
    questionBlock = document.getElementById('questionBlockID');
    question = document.getElementById('questionID');
    // Setting up audio
    isDesktopBrowser = navigator.userAgent.search(/(ipad)|(iphone)|(ipod)|(android)|(webos)|(mobi)|(mini)/i) < 0;
    properlyLoaded = (!isDesktopBrowser && window.opera) ? HTMLMediaElement.HAVE_CURRENT_DATA : HTMLMediaElement.HAVE_ENOUGH_DATA;
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
    granted = createAudio(GRANTED);
    denied = createAudio(DENIED);
    medias = [[welcome], [granted], [denied]];
    for (var i = 0, riddle; riddle = RIDDLES[i++];) {
        riddle[0] = createAudio(riddle[0]);
        var answers = riddle[1];
        var maxLength = 0;
        for (var j in riddle[1]) {
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
        if (errors) { // avoid repeated click reaction
            startupBlock.onclick = function() { delay(start) };
            debug(errors + ' errors found, click to continue');
        } else {
            setTimeout(start, 200); // needs to be investigated
        }
    } else {
        delay(waitForMedia);
    }
}

function start() {
    busy = null;
    answers =  null;
    questionTimeout = null;
    riddles = [];
    welcome = medias[0][0];
    granted = medias[1][0];
    denied = medias[2][0];
    question.onblur = focus;
    question.onmousedown = mouseButtonHandler;
    question.onmouseup = mouseButtonHandler;
    question.onkeydown = keyDownHandler;
    question.onkeypress = keypressHandler;
    workingBlock.tabIndex = 0; // to enable keypress
    latinToCyrillic = createL2CMap();
    properKeyCodes = createProperKeyCodes();
    hide(startupBlock);
    show(workingBlock);
    playAudio(welcome, idle);
    workingBlock.onkeypress = tap;
    body.oncontextmenu = prevent;
}

function idle() {
    resetQuestionTimeout();
    hide(questionBlock);
    busy = false;
    workingBlock.onclick = tap;
    workingBlock.focus();
}

function tap(e) {
    e = e || window.event;
    prevent(e);
    if (busy || e && (e.altKey || e.ctrlKey || e.metaKey)) {
        return;
    }
    busy = true;
    if (!answers) { // change riddle it it was answered
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
}

function ask() {
    question.maxLength = maxAnswerLength;
    question.value = '';
    show(questionBlock);
    focus();
    workingBlock.onclick = focus;
    resetQuestionTimeout(true);
}

function mouseButtonHandler(e) {
    e = e || window.event;
    return (e.which === 1 || e.button === 0);
}

function keyDownHandler(e) {
    e = e || window.event;
    return properKeyCodes.indexOf(e.keyCode) >= 0;
}

function keypressHandler(e) {
    resetQuestionTimeout(true);
    e = e || window.event;
    prevent(e);
    if (!e.altKey && !e.ctrlKey && !e.metaKey) {
        if (question.value.length < question.maxLength) {
            if (e.charCode >= 'А'.charCodeAt(0) && e.charCode <= 'я'.charCodeAt(0)) {
                question.value += String.fromCharCode(e.charCode);
            } else if (c = latinToCyrillic[e.charCode]) {
                question.value += c; // map latins to cyrillic
            }
        }
        if (!e.shiftKey) {
            switch(e.keyCode) {
            case BACKSPACE:
                question.value = question.value.substring(0, question.value.length - 1);
                break;
            case ENTER: // submit
                resetQuestionTimeout();
                hide(questionBlock);
                if (answers.indexOf(question.value.toLowerCase()) >= 0) {
                    answers = null;
                    playAudio(granted, idle);
                } else if (question.value) {
                    playAudio(denied, idle);
                } else {
                    delay(idle); // avoid repeated keypress
                }
                break;
            case ESCAPE:
                delay(idle); // avoid repeated keypress
                break;
            }
        }
    }
}
