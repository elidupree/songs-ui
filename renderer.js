// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const songs = require('codecophony-render-gui');
// document.write(songs.poll_rendered());

function push_input (input) {
  songs.push_gui_input (JSON.stringify(input));
}

let semitone_ratio = Math.pow (2, 1/12);
let log_semitone_ratio = Math.log (semitone_ratio);

let redraw_phrases = [];
let playback_position;
let playback_start = 0.0;
let playback_end = 10.0;

function midi_pitch_to_frequency(pitch) {
  return 440.0*semitone_ratio.pow(pitch-69);
}
function frequency_to_nearest_midi_pitch(frequency) {
  return 69 + Math.round(Math.log(frequency/440.0)/log_semitone_ratio);
}

function draw_phrase (phrase) {
  let result = document.createElement ("div");
  let canvas = document.createElement ("canvas");
  let context = canvas.getContext ("2d");
  result.appendChild (canvas) ;
  let min_time = 0.0;
  let max_time = 10.0;
  let min_frequency = 130.0;
  let max_frequency = 880.0;
  phrase.data.notes.forEach(function(note) {
    min_time = Math.min (min_time, note.start - 1);
    max_time = Math.max (max_time, note.end + 1);
    min_frequency = Math.min (min_frequency, note.frequency);
    max_frequency = Math.max (max_frequency, note.frequency);
    note.log_frequency = Math.log (note.frequency)
  });
  
  //if (min_time > max_time) { return result; }
  
  let time_width = max_time - min_time;
  let log_min_frequency = Math.log (min_frequency) - log_semitone_ratio*12.5;
  let log_max_frequency = Math.log (max_frequency) + log_semitone_ratio*12.5;
  let log_frequency_ratio = log_max_frequency - log_min_frequency;
  let semitone_height = log_frequency_ratio/log_semitone_ratio;
  
  let time_scale = 32;
  let width = time_width*time_scale;
  let semitone_scale = 5;
  let height = semitone_height*semitone_scale;
  let log_frequency_scale = semitone_scale/log_semitone_ratio;
  
  canvas.setAttribute ("width", width);
  canvas.setAttribute ("height", height);
  
  let redraw = function() {
    context.fillStyle = "#eee";
    context.fillRect(0,0,width,height);
    
    context.fillStyle = "#000";
    phrase.data.notes.forEach(function(note) {
      let start = (note.start - min_time) * time_scale;
      let end = (note.end - min_time) * time_scale;
      let midh = log_max_frequency - note.log_frequency;
      let top = height * ((midh - log_semitone_ratio/2) / log_frequency_ratio);
      let bottom = height * ((midh + log_semitone_ratio/2) / log_frequency_ratio);
      //console.log(start, top, end-start, bottom-top);
      context.fillRect(start, top, end-start, bottom-top);
    });
    
    if (phrase.timed_with_playback) {
      context.fillStyle = "#f00";
      context.fillRect((playback_position - min_time)*time_scale, 0, 1, height);
      context.fillRect((playback_start    - min_time)*time_scale, 0, 1, height);
      context.fillRect((playback_end      - min_time)*time_scale, 0, 1, height);
    }
  };
  
  if (phrase.timed_with_playback && phrase.editing_id === null) {
  let dragging_mouse_original_time = null;
  let dragging_start;
  let dragging_original_start;
  let dragging_original_end;
  
  canvas.addEventListener ("mousedown", function (event) {
    let mouse_x = event.clientX - canvas.offsetLeft;
    let mouse_time = mouse_x/time_scale + min_time;
    
    dragging_mouse_original_time = mouse_time;
    dragging_start = Math.abs(mouse_time - playback_start) < Math.abs(mouse_time - playback_end);
    dragging_original_start = playback_start;
    dragging_original_end = playback_end;
  });
  document.addEventListener ("mousemove", function (event) {
    let mouse_x = event.clientX - canvas.offsetLeft;
    let mouse_time = mouse_x/time_scale + min_time;
    if (dragging_mouse_original_time !== null) {
      //console.log(event.clientX, canvas.offsetLeft);
      if (mouse_time < min_time || mouse_time > max_time) {
        playback_start = dragging_original_start;
        playback_end = dragging_original_end;
      }
      else if (dragging_start) {
        playback_start = mouse_time;
        playback_end = Math.max(dragging_original_end, playback_start + 0.1);
      } else {
        playback_end = mouse_time;
        playback_start = Math.min(dragging_original_start, playback_end - 0.1);
      }
    }
  });
  document.addEventListener ("mouseup", function (event) {
    dragging_mouse_original_time = null;
    push_input ({
      "SetPlaybackRange": [playback_start, playback_end],
    });
  });
  }
  
  if (phrase.editing_id !== null) {
  console.log ( [phrase.editing_id, phrase.data]);
    canvas.addEventListener ("click", function (event) {
      let mouse_x = event.clientX - canvas.offsetLeft;
      let mouse_time = mouse_x/time_scale + min_time;
      let mouse_y = canvas.offsetTop + height - event.clientY;
      let mouse_frequency = Math.exp(mouse_y/log_frequency_scale + log_min_frequency);
      phrase.data.notes.push ({start: mouse_time, end: mouse_time +1, frequency: mouse_frequency, tags: []});
      console.log ( [phrase.editing_id, phrase.data]);
      push_input ({
        "EditPhrase": [phrase.editing_id, phrase.data],
      });
    });
  }
  
  //redraw();
  
  return [result, redraw];
}

function update() {
  let updates = JSON.parse(songs.poll_updates());
  updates.forEach(function(update) {
    if (update.ReplacePhrases) {
      let phrases_element = document.getElementById ("phrases");
      phrases_element.innerHTML = "";
      redraw_phrases = [];
      update.ReplacePhrases.forEach(function(phrase) {
        let drawn = draw_phrase (phrase);
        phrases_element.appendChild (drawn[0]);
        redraw_phrases.push(drawn[1]);
      });
    }
    if (update.UpdatePlaybackPosition) {
      playback_position = update.UpdatePlaybackPosition;
    }
  });
  
  redraw_phrases.forEach(function(redraw) {
    redraw();
  });
}

setInterval (update, 100);
