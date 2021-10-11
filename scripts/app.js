var MyApp = (function () {

    var socket = null;
    var socker_url = 'http://localhost:3000';
    var meeting_id = '';
    var user_id = '';
    var tag = document.createElement('script');

    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // 3. This function creates an <iframe> (and YouTube player)
    //    after the API code downloads.
    var player;

    function init(uid, mid) {
        user_id = uid;
        meeting_id = mid;

        $('#meetingname').text(meeting_id);
        $('#me h4').text(user_id + '(Me)');
        document.title = user_id;

        SignalServerEventBinding();
        onYouTubeIframeAPIReady();
        EventBinding();
    }


    function SignalServerEventBinding() {

        socket = io.connect(socker_url);

        var serverFn = function (data, to_connid) {
            socket.emit('exchangeSDP', { message: data, to_connid: to_connid });

        };

        socket.on('reset', function () {
            location.reload();
        });

        socket.on('exchangeSDP', async function (data) {
            await WrtcHelper.ExecuteClientFn(data.message, data.from_connid);
        });

        socket.on('informAboutNewConnection', function (data) {
            AddNewUser(data.other_user_id, data.connId);
            WrtcHelper.createNewConnection(data.connId);
        });

        socket.on('informAboutConnectionEnd', function (connId) {
            $('#' + connId).remove();
            WrtcHelper.closeExistingConnection(connId);
        });

        socket.on('showChatMessage', function (data) {

            var name = document.createElement("P");
            name.innerHTML = data.from;
            name.style.fontWeight = "bold";
            name.style.marginBottom = "0px";
            document.getElementById("messages").appendChild(name);

            var dateandtime = document.createElement("P");
            dateandtime.innerHTML = data.time;
            dateandtime.style.marginBottom = "0px";
            dateandtime.style.fontWeight = "bold";
            dateandtime.style.fontSize = "12px";
            dateandtime.style.color = "#000";
            document.getElementById("messages").appendChild(dateandtime);

            var messagetext = document.createElement("P");
            messagetext.innerHTML = data.message;

            document.getElementById("messages").appendChild(messagetext);

        });

        socket.on('connect', () => {
            if (socket.connected) {
                WrtcHelper.init(serverFn, socket.id);

                if (user_id != "" && meeting_id != "") {
                    socket.emit('userconnect', { dsiplayName: user_id, meetingid: meeting_id });

                }
            }
        });

        socket.on('userconnected', function (other_users) {
            $('#divUsers .other').remove();
            if (other_users) {
                for (var i = 0; i < other_users.length; i++) {
                    AddNewUser(other_users[i].user_id, other_users[i].connectionId);
                    WrtcHelper.createNewConnection(other_users[i].connectionId);
                }
            }
            $(".toolbox").show();
            $('#messages').show();
            $('#divUsers').show();
        });
        socket.on('seekAll', function (time) {
            console.log("justseek");
            var clientTime = player.getCurrentTime();
            if (clientTime < time - .2 || clientTime > time + .2) {
                // if (alert('Do you want to sync with admin at ' + convertHMS(time))) {
                player.seekTo(time);
                // Forces video to play right after seek
                player.playVideo();
                // }

            }
        });
        socket.on('playAll', function (data) {
            console.log("playAll");
            // player.seekTo(time);
            // Forces video to play right after seek
            // console.log("PlayAll" + data.meetingId +" : "+meeting_id);
            // if (data.meetingId == meeting_id) {
            player.playVideo();
            // }

            // player.playVideo();
        });
        socket.on('pauseAll', function (Time) {
            console.log("pauseAll");

            // player.seekTo(time);
            // Forces video to stop right after seek
            // if (data.meetingId == meeting_id) {
            player.pauseVideo();
            // }
            // player.playVideo();
        });
        socket.on('playNewVid', function (vidId) {
            player.loadVideoById(vidId, 0);

        });
        socket.on('Not Allowed', function () {
            // $('divVidUrl').after($("<p></p>").text("Only admin can add new video"));
            console.log('Not Allowed');
        });
    }

    function EventBinding() {
        $('#btnResetMeeting').on('click', function () {
            socket.emit('reset');
        });

        $('#btnsend').on('click', function () {
            socket.emit('sendMessage', $('#msgbox').val());
            $('#msgbox').val('');
        });

        $('#invite').on('click', function () {

            var str1 = "https://127.0.0.1:5501/?mid=";
            var str2 = meeting_id;

            var res = str1.concat(str2);

            navigator.clipboard.writeText(res);
            alert("Meeting id copied to clipboard. ");

        });

        $('#msgbox').keypress(function (e) {
            var key = e.which;
            if (key == 13)  // the enter key code
            {
                $('#btnsend').click();
                return false;
            }
        });

        $('#me').on('dblclick', 'video', function () {
            //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            var minVideo = document.getElementById('localVideoCtr');
            // var maxVideo = document.getElementById('mVideoPlayer');

            // var stream = minVideo.captureStream();
            // maxVideo.srcObject = stream;
            minVideo.requestFullscreen();
            // $('#player').hide();
            player.pauseVideo();
        });
        $('#mVideoPlayer').on('dblclick', function () {
            this.requestFullscreen();
        });

        $('#vidURL').keypress(function (e) {
            if (e.which == 13) {

                var vidId = getId($('#vidURL').val());

                // player.loadVideoById(vidId, 0);

                socket.emit('newVideoId',
                    {
                        connId: socket.id,
                        videoId: vidId,
                    });
                return false;
            }
        });
    }

    function AddNewUser(other_user_id, connId) {
        var $newDiv = $('#otherTemplate').clone();
        $newDiv = $newDiv.attr('id', connId).addClass('other');
        $newDiv.dblclick(function () {

            var minVideo = document.getElementById("v_" + connId);
            minVideo.requestFullscreen();
            player.pauseVideo();
        });
        $newDiv.find('h4').text(other_user_id);
        $newDiv.find('video').attr('id', 'v_' + connId);
        $newDiv.find('audio').attr('id', 'a_' + connId);
        $newDiv.show();
        $('#divUsers').append($newDiv);
    }

    function getId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);

        return (match && match[2].length === 11)
            ? match[2]
            : null;
    }
    function convertHMS(value) {
        const sec = parseInt(value, 10); // convert value to number if it's string
        let hours = Math.floor(sec / 3600); // get hours
        let minutes = Math.floor((sec - (hours * 3600)) / 60); // get minutes
        let seconds = sec - (hours * 3600) - (minutes * 60); //  get seconds
        // add 0 if value < 10; Example: 2 => 02
        if (hours < 10) { hours = "0" + hours; }
        if (minutes < 10) { minutes = "0" + minutes; }
        if (seconds < 10) { seconds = "0" + seconds; }
        return hours + ':' + minutes + ':' + seconds; // Return is HH : MM : SS
    }

    // 2. This code loads the IFrame Player API code asynchronously.

    function onYouTubeIframeAPIReady() {
        player = new YT.Player('player', {
            height: 560,
            width: 700,
            videoId: 'G5RpJwCJDqc',
            playerVars: {
                'playsinline': 1
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    }

    // 4. The API will call this function when the video player is ready.
    function onPlayerReady(event) {
        event.target.pauseVideo();
    }

    // 5. The API calls this function when the player's state changes.
    //    The function indicates that when playing a video (state=1),
    //    the player should play for six seconds and then stop.
    function onPlayerStateChange(event) {
        // Event Listeners
        playerStatus = event.data;
        console.log(playerStatus)
        var currTime = 0;

        switch (playerStatus) {
            case 0:
                //video ended
                break;
            case 1:
                //onplay
                currTime = player.getCurrentTime();
                socket.emit('play others',
                    {
                        connId: socket.id,
                        currentTime: currTime
                    });
                break;
            case 2:
                //onpause
                currTime = player.getCurrentTime();
                socket.emit('pause others', {
                    connId: socket.id,
                    currentTime: currTime
                });
                break;
            case 3:
                currTime = player.getCurrentTime();
                socket.emit('seek', {
                    connId: socket.id,
                    currentTime: currTime
                });
                break;
        }
    }
    function stopVideo() {
        player.stopVideo();
    }

    return {

        _init: function (uid, mid) {
            init(uid, mid);
        }

    };

}());