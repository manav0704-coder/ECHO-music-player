console.log('Let\'s write JavaScript code');

let currentAudio = null;
let isPlaying = false;
let seekInterval = null;
let currentSongElement = null;
let currentSongIndex = 0;
let songList = [];
let currentFolder = "";

const BASE_URL = "https://echomedia.freewebhostmost.com/music";

async function getSongs(folder = "") {
    try {
        let url = folder ? `${BASE_URL}/${folder}` : BASE_URL;
        console.log(`Fetching songs from URL: ${url}`);
        
        let response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Network response was not ok: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        let textData = await response.text();
        let parser = new DOMParser();
        let doc = parser.parseFromString(textData, 'text/html');
        let links = Array.from(doc.querySelectorAll('a')).map(a => a.href);
        let songNames = links.filter(link => link.endsWith('.mp3')).map(link => link.split('/').pop());
        
        return songNames;
    } catch (error) {
        console.error('Error fetching songs from API:', error);
        return [];
    }
}

const playMusic = (track, songElement) => {
    if (currentAudio) {
        currentAudio.pause();
        if (currentSongElement) {
            currentSongElement.querySelector(".playButton").src = "./images/play.svg";
        }
    }

    let url = currentFolder ? `${BASE_URL}/${currentFolder}/${track}` : `${BASE_URL}/${track}`;
    console.log(`Playing song from URL: ${url}`);
    currentAudio = new Audio(url);
    currentAudio.play().catch(error => {
        console.error(`Error playing audio: ${error.message}`);
    });
    isPlaying = true;
    document.querySelector(".songinfo").innerText = track;
    document.getElementById("playButton").src = "./images/pause.svg";

    currentSongElement = songElement;
    if (currentSongElement) {
        currentSongElement.querySelector(".playButton").src = "./images/pause.svg";
    }

    currentAudio.onloadedmetadata = () => {
        const duration = formatTime(currentAudio.duration);
        document.querySelector(".songtime").innerText = duration;
        updateSeekBar();
    };

    currentAudio.ontimeupdate = () => {
        updateSeekBar();
    };

    currentAudio.onended = () => {
        document.getElementById("playButton").src = "./images/play.svg";
        if (currentSongElement) {
            currentSongElement.querySelector(".playButton").src = "./images/play.svg";
        }
        isPlaying = false;
        clearInterval(seekInterval);

        // Auto play next song if shuffle mode is on
        if (isShuffleMode) {
            playRandomSong();
        }
    };

    if (seekInterval) {
        clearInterval(seekInterval);
    }

    seekInterval = setInterval(() => {
        if (currentAudio && isPlaying) {
            updateSeekBar();
        }
    }, 1000);

    // Hide sidebar when song starts playing
    hideSidebar();
};

const togglePlayPause = () => {
    if (currentAudio) {
        if (isPlaying) {
            currentAudio.pause();
            isPlaying = false;
            document.getElementById("playButton").src = "./images/play.svg";
            if (currentSongElement) {
                currentSongElement.querySelector(".playButton").src = "./images/play.svg";
            }
        } else {
            currentAudio.play().catch(error => {
                console.error(`Error resuming audio: ${error.message}`);
            });
            isPlaying = true;
            document.getElementById("playButton").src = "./images/pause.svg";
            if (currentSongElement) {
                currentSongElement.querySelector(".playButton").src = "./images/pause.svg";
            }
        }
    }
};

const updateSeekBar = () => {
    if (currentAudio) {
        const progress = (currentAudio.currentTime / currentAudio.duration) * 100;
        document.querySelector(".progress").style.width = `${progress}%`;
        document.querySelector(".circle").style.left = `${progress}%`;

        const currentTime = formatTime(currentAudio.currentTime);
        const duration = formatTime(currentAudio.duration);
        document.querySelector(".songtime").innerText = `${currentTime} / ${duration}`;
    }
};

const seek = (event) => {
    const seekBar = document.querySelector(".seekbar");
    const seekBarRect = seekBar.getBoundingClientRect();
    const offsetX = event.clientX - seekBarRect.left;
    const seekWidth = seekBarRect.width;
    const seekPercentage = offsetX / seekWidth;
    if (currentAudio) {
        currentAudio.currentTime = currentAudio.duration * seekPercentage;
        updateSeekBar();
    }
};

const playNextSong = () => {
    if (isShuffleMode) {
        playRandomSong();
    } else {
        currentSongIndex = (currentSongIndex + 1) % songList.length;
        playMusic(songList[currentSongIndex], document.querySelector(`li[data-index="${currentSongIndex}"]`));
    }
};

const playPreviousSong = () => {
    if (isShuffleMode) {
        playRandomSong();
    } else {
        currentSongIndex = (currentSongIndex - 1 + songList.length) % songList.length;
        playMusic(songList[currentSongIndex], document.querySelector(`li[data-index="${currentSongIndex}"]`));
    }
};

const playRandomSong = () => {
    const newIndex = Math.floor(Math.random() * songList.length);
    currentSongIndex = newIndex;
    playMusic(songList[currentSongIndex], document.querySelector(`li[data-index="${currentSongIndex}"]`));
};

let isShuffleMode = true; // Initially shuffle mode is enabled

const toggleShuffleMode = () => {
    isShuffleMode = !isShuffleMode;
    const shuffleButton = document.getElementById("shuffleButton");
    shuffleButton.src = isShuffleMode ? "./images/shuffle.svg" : "./images/closeshuffle.svg";
};

const initializePlaybar = () => {
    document.getElementById("playButton").addEventListener("click", togglePlayPause);
    document.getElementById("nextButton").addEventListener("click", playNextSong);
    document.getElementById("previousButton").addEventListener("click", playPreviousSong);
    document.getElementById("shuffleButton").addEventListener("click", toggleShuffleMode);
    document.querySelector(".seekbar").addEventListener("click", (event) => seek(event));

    // Volume button and slider initialization
    const volumeButton = document.getElementById("volumeButton");
    const volumeRange = document.getElementById("volumeRange");
    let currentVolume = volumeRange.value;

    volumeButton.addEventListener("click", toggleMute);
    volumeRange.addEventListener("input", adjustVolume);

    function toggleMute() {
        if (currentAudio) {
            currentAudio.muted = !currentAudio.muted;
            updateVolumeIcon();
        }
    }

    function adjustVolume() {
        if (currentAudio) {
            currentVolume = volumeRange.value;
            currentAudio.volume = currentVolume;
            updateVolumeIcon();
        }
    }

    function updateVolumeIcon() {
        if (currentAudio) {
            if (currentAudio.muted || currentAudio.volume === 0) {
                volumeButton.src = "./images/volumeoff.svg"; // Update to your mute icon
            } else {
                volumeButton.src = "./images/volume.svg"; // Update to your volume icon
            }
        }
    }
};

const initializePlaylist = async (folder = "") => {
    try {
        currentFolder = folder; // Save the current folder
        let songs = await getSongs(folder);
        songList = songs; // Save the list of songs
        let songUL = document.querySelector(".song-list ul");
        songUL.innerHTML = '';

        songs.forEach((song, index) => {
            songUL.innerHTML += `
                <li data-index="${index}">
                    <img class="invert" src="./images/music.svg" alt="music">
                    <div class="info">
                        <div>${song}</div>
                    </div>
                    <div class="playnow">
                        <span>Play Now</span>
                        <img class="invert playButton" src="./images/play.svg" alt="play">
                    </div>
                </li>`;
        });

        Array.from(songUL.getElementsByTagName("li")).forEach(songElement => {
            songElement.addEventListener("click", () => {
                let songTitle = songElement.querySelector(".info > div:first-child").textContent.trim();
                currentSongIndex = parseInt(songElement.getAttribute("data-index"));
                playMusic(songTitle, songElement);
            });
        });
    } catch (error) {
        console.error('Error initializing playlist:', error);
    }
};

const hideSidebar = () => {
    const sidebar = document.getElementById("sidebar");
    sidebar.style.display = "none";
};

const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

document.addEventListener("DOMContentLoaded", () => {
    initializePlaybar();
    initializePlaylist();
});
