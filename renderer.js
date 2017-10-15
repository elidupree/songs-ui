// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const songs = require('codecophony-render-gui');
// document.write(songs.poll_rendered());

function push_input (input) {
  songs.push_gui_input (JSON.stringify(input));
}

function iterate_keys (keys, callback) {
  Object.getOwnPropertyNames (keys).forEach(callback);
}
function iterate_values (keys, callback) {
  Object.getOwnPropertyNames (keys).forEach(key=>{callback(keys[key], key)});
}

let semitone_ratio = Math.pow (2, 1/12);
let sqrt_semitone_ratio = Math.pow (2, 1/24);
let log_semitone_ratio = Math.log (semitone_ratio);

let phrases_metadata = {}
let playback_start = 0.0;
let playback_end = 10.0;
let playback_position = 0.0;

function midi_pitch_to_frequency(pitch) {
  return 440.0*semitone_ratio.pow(pitch-69);
}
function frequency_to_nearest_midi_pitch(frequency) {
  return 69 + Math.round(Math.log(frequency/440.0)/log_semitone_ratio);
}

function draw_phrase (phrase, phrase_index) {
  let div = document.createElement ("div");
  let canvas = document.createElement ("canvas");
  let context = canvas.getContext ("2d");
  div.appendChild (canvas) ;
  let min_time = 0.0;
  let max_time = 4.0;
  let min_frequency = 130.0;
  let max_frequency = 880.0;
  phrase.data.notes.forEach(function(note, index) {
    min_time = Math.min (min_time, note.start - 1);
    max_time = Math.max (max_time, note.end + 1);
    min_frequency = Math.min (min_frequency, note.frequency);
    max_frequency = Math.max (max_frequency, note.frequency);
  });
  
  let time_width = max_time - min_time;
  let log_min_frequency = Math.log (min_frequency) - log_semitone_ratio*12.5;
  let log_max_frequency = Math.log (max_frequency) + log_semitone_ratio*12.5;
  let log_frequency_ratio = log_max_frequency - log_min_frequency;
  let semitone_height = log_frequency_ratio/log_semitone_ratio;
  
  let time_scale = 80;
  let width = time_width*time_scale;
  let semitone_scale = 10;
  let height = semitone_height*semitone_scale;
  let log_frequency_scale = semitone_scale/log_semitone_ratio;
  
  canvas.setAttribute ("width", width);
  canvas.setAttribute ("height", height);
  
  let note_coordinates = function (note, target) {
    let result = target || {};
    result.canvas_min_x = (note.start - min_time) * time_scale;
    result.canvas_max_x = (note.end - min_time) * time_scale;
    result.canvas_width = result.canvas_max_x - result.canvas_min_x;
    result.log_frequency = Math.log (note.frequency);
    let midh = log_max_frequency - result.log_frequency;
    result.canvas_min_y_downwards = height * ((midh - log_semitone_ratio/2) / log_frequency_ratio);
    result.canvas_max_y_downwards = height * ((midh + log_semitone_ratio/2) / log_frequency_ratio);
    result.canvas_height = result.canvas_max_y_downwards - result.canvas_min_y_downwards;
    result.min_displayed_frequency = note.frequency/sqrt_semitone_ratio;
    result.max_displayed_frequency = note.frequency*sqrt_semitone_ratio;
    return result;
  }
  
  phrase.data.notes.forEach(function(note) {
    note.coordinates = note_coordinates(note);
  });
  
  let get_coordinates = function (canvas_x, canvas_y_downwards) {
    let result = {};
    result.canvas_x = canvas_x;
    result.time = result.canvas_x/time_scale + min_time;
    result.canvas_y_downwards = canvas_y_downwards;
    result.canvas_y_upwards = height - result.canvas_y_downwards;
    result.frequency = Math.exp(result.canvas_y_upwards/log_frequency_scale + log_min_frequency);
    result.on_canvas_horizontally = (result.time >= min_time && result.time <= max_time);
    result.on_canvas_vertically = (result.canvas_y_downwards >= 0 && result.canvas_y_downwards <= height);
    result.on_canvas = result.on_canvas_horizontally && result.on_canvas_vertically;
    return result;
  };
  
  let mouse_coordinates = function (event) {
    return get_coordinates(event.pageX - canvas.offsetLeft, event.pageY - canvas.offsetTop);
  };
  
  let get_overlapping_note = function (coordinates) {
    return phrase.data.notes.find(function(note) {
      if ( note.coordinates.canvas_min_x < coordinates.canvas_x
        && note.coordinates.canvas_max_x > coordinates.canvas_x
        && note.coordinates.canvas_min_y_downwards < coordinates.canvas_y_downwards
        && note.coordinates.canvas_max_y_downwards > coordinates.canvas_y_downwards) {
        return true;
      }
    }) || null;
  };
  let get_overlapping_notes = function (x1,y1,x2,y2) {
    return phrase.data.notes.filter(function(note) {
      //console.log (x1,y1,x2,y2, note) ;
      /*console.log (
        note.coordinates.canvas_min_x < x1,
        note.coordinates.canvas_min_x < x2,
        note.coordinates.canvas_max_x > x1,
        note.coordinates.canvas_max_x > x2,
        note.coordinates.canvas_min_y_downwards < y1,
        note.coordinates.canvas_min_y_downwards < y2,
        note.coordinates.canvas_max_y_downwards > y1,
        note.coordinates.canvas_max_y_downwards > y2) ;*/
      if ( (note.coordinates.canvas_min_x < x1 ||
            note.coordinates.canvas_min_x < x2)
        && (note.coordinates.canvas_max_x > x1 ||
            note.coordinates.canvas_max_x > x2)
        && (note.coordinates.canvas_min_y_downwards < y1 ||
            note.coordinates.canvas_min_y_downwards < y2)
        && (note.coordinates.canvas_max_y_downwards > y1 ||
            note.coordinates.canvas_max_y_downwards > y2)
        ) {
        //console.log (x1,y1,x2,y2, note) ;
        return true;
      }
      return false;
    });
  };
  
  let drag_select = null;
  let drag_move = null;
  let selected_notes = {};
  let dragged_note = function (note) {
    let result = Object.assign({}, note, {
      start: note.start + drag_move.current_coordinates.time - drag_move.original_coordinates.time,
      end: note.end + drag_move.current_coordinates.time - drag_move.original_coordinates.time,
      frequency: note.frequency + drag_move.current_coordinates.frequency - drag_move.original_coordinates.frequency,
    });
    result.coordinates = note_coordinates (result);
    return result;
  };
  let draw_note = function(note) {
    let coordinates = note.coordinates;
    
    context.fillRect(coordinates.canvas_min_x, coordinates.canvas_min_y_downwards, coordinates.canvas_width, coordinates.canvas_height);
    if (selected_notes [note.index]) {
      context.strokeRect(coordinates.canvas_min_x, coordinates.canvas_min_y_downwards, coordinates.canvas_width, coordinates.canvas_height);
    }
  };
  
  let redraw = function() {
    context.fillStyle = "#eee";
    context.fillRect(0,0,width,height);
    
    context.fillStyle = "#000";
    //context.lineWidth = 4;
    context.strokeStyle = "#00f";
    
    phrase.data.notes.forEach(function(note) {
      if (drag_move && selected_notes [note.index]) {
        draw_note (dragged_note (note));
      }
      else {
        draw_note (note);
      }
    });
    
    if (phrase.timed_with_playback) {
      context.fillStyle = "#f00";
      context.fillRect((playback_position - min_time)*time_scale, 0, 1, height);
      context.fillRect((playback_start    - min_time)*time_scale, 0, 1, height);
      context.fillRect((playback_end      - min_time)*time_scale, 0, 1, height);
    }
    
    if (drag_select !== null) {
      context.strokeStyle = "#f00";
      context.strokeRect (
        drag_select.original_coordinates.canvas_x,
        drag_select.original_coordinates.canvas_y_downwards,
        drag_select.current_coordinates.canvas_x - drag_select.original_coordinates.canvas_x,
        drag_select.current_coordinates.canvas_y_downwards - drag_select.original_coordinates.canvas_y_downwards);
    }
  };
  
  if (phrase.timed_with_playback && !phrase.editable) {
  let dragging_mouse_original_time = null;
  let dragging_start;
  let dragging_original_start;
  let dragging_original_end;
  
  canvas.addEventListener ("mousedown", function (event) {
    let coordinates = mouse_coordinates (event);
    dragging_mouse_original_time = coordinates.time;
    dragging_start = Math.abs(coordinates.time - playback_start) < Math.abs(coordinates.time - playback_end);
    dragging_original_start = playback_start;
    dragging_original_end = playback_end;
  });
  document.addEventListener ("mousemove", function (event) {
    let coordinates = mouse_coordinates (event);
    if (dragging_mouse_original_time !== null) {
      //console.log(coordinates);
      if (!coordinates.on_canvas_horizontally) {
        playback_start = dragging_original_start;
        playback_end = dragging_original_end;
      }
      else if (dragging_start) {
        playback_start = coordinates.time;
        playback_end = Math.max(dragging_original_end, playback_start + 0.1);
      } else {
        playback_end = coordinates.time;
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
  
  if (phrase.editable) {
    
    let changed = function() { push_input ({
      "EditPhrase": [phrase_index, phrase.data],
    }); };
    let for_selected = function (callback) {
      iterate_keys (selected_notes, function(index) {
        callback (phrase.data.notes [index]);
      });
    };
    
    let modify_selection = function (notes, event) {
      console.log(notes);
      if (!event.shiftKey && !event.ctrlKey) {
        selected_notes = {};
      }
      if (event.ctrlKey) {
        notes.forEach(function(note) {
          delete selected_notes[note.index];
        });
      }
      else {
        notes.forEach(function(note) {
          selected_notes[note.index] = true;
        });
      }
    }
        
    canvas.addEventListener ("click", function (event) {
      let coordinates = mouse_coordinates (event);
      let overlapping = get_overlapping_note (coordinates);
      //console.log (coordinates, overlapping ) ;
      if (overlapping === null && event.shiftKey) {
        let note = {start: coordinates.time, end: coordinates.time +1, frequency: coordinates.frequency, tags: [], index: phrase.data.notes.length};
        note.coordinates = note_coordinates(note);
        phrase.data.notes.push (note);
        changed();
      }
      else if (overlapping !== null) {
        modify_selection ([overlapping], event);
      }
      else {
        modify_selection ([], event);
      }
    });
    
    
    
    canvas.addEventListener ("mousedown", function (event) {
      let coordinates = mouse_coordinates (event);
      let overlapping = get_overlapping_note (coordinates);
      if (overlapping === null) {
        drag_select = {event: event, original_coordinates: coordinates, current_coordinates: coordinates};
      }
      else {
        drag_move = {event: event, original_coordinates: coordinates, current_coordinates: coordinates};
      }
    });
    
    document.addEventListener ("mousemove", function (event) {
      let coordinates = mouse_coordinates (event);
      (drag_select || drag_move || {}).current_coordinates = coordinates;
    });
    
    document.addEventListener ("mouseup", function (event) {
      let coordinates = mouse_coordinates (event);
      if (drag_move) {
        if (coordinates.on_canvas) {
          for_selected (note => {
            phrase.data.notes [note.index] = dragged_note (note);
          });
          changed();
        }
        drag_move = null;
      }
      
      if (drag_select) {
        let notes = get_overlapping_notes (
          drag_select.original_coordinates.canvas_x,
          drag_select.original_coordinates.canvas_y_downwards,
          drag_select.current_coordinates.canvas_x,
          drag_select.current_coordinates.canvas_y_downwards);
        
        modify_selection (notes, drag_select.event);
        
        drag_select = null;
      }
    });
  }
  
  //redraw();
  
  return {
    element: div,
    redraw: redraw,
  };
}

function update() {
  let updates = JSON.parse(songs.poll_updates());
  let phrases_element = document.getElementById ("phrases");
  updates.forEach(function(update) {
    if (update.ReplacePhrase) {
      //console.log (update);
      let index = update.ReplacePhrase [0];
      let phrase = update.ReplacePhrase[1];

      if (phrases_metadata[index]) {
        let element = phrases_metadata[index].element;
        element.parentNode.removeChild (element);
        delete phrases_metadata[index];
      }
      if (phrase !== null) {
        let drawn = draw_phrase (phrase, index);
        phrases_element.appendChild (drawn.element);
        phrases_metadata[index] = drawn;
      }
    }
    if (update.UpdatePlaybackPosition) {
      playback_position = update.UpdatePlaybackPosition;
    }
  });
  
  iterate_values (phrases_metadata, function(metadata) {
    metadata.redraw();
  });
}

setInterval (update, 100);
