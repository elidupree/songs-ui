const _ = require ("lodash") ;

window.phrases_dimensions = function (phrases) {
    const metadata = {};
    
    metadata.min_time = 0.0;
    metadata.max_time = 4.0;
    metadata.min_frequency = 130.0;
    metadata.max_frequency = 880.0;
    
    _.forOwn(phrases, function(phrase) {
      window.contribute_phrase_dimensions (phrase, metadata);
    });
    
    metadata.pixels_per_second = 80;
    metadata.pixels_per_semitone = 10;
    metadata.pixels_per_log_frequency = metadata.pixels_per_semitone/log_semitone_ratio;
    metadata.canvas_width = metadata.width_in_seconds*metadata.pixels_per_second;
    metadata.canvas_height = metadata.height_in_semitones*metadata.pixels_per_semitone;
    
    //metadata.pixels_per_second = metadata.canvas_width / metadata.width_in_seconds;
    //metadata.pixels_per_semitone = metadata.canvas_height / metadata.height_in_log_frequency;
    //metadata.pixels_per_log_frequency = metadata.canvas_height / metadata.height_in_semitones;
    
    return metadata;
}


window.contribute_phrase_dimensions = function (phrase, metadata) {
    phrase.data.notes.forEach(function(note, index) {
      metadata.min_time = Math.min (metadata.min_time, note.start - 1);
      metadata.max_time = Math.max (metadata.max_time, note.end + 1);
      metadata.min_frequency = Math.min (metadata.min_frequency, note.frequency*Math.pow(semitone_ratio, -12.5));
      metadata.max_frequency = Math.max (metadata.max_frequency, note.frequency*Math.pow(semitone_ratio, 12.5));
    });
    
    metadata.width_in_seconds = metadata.max_time - metadata.min_time;
    metadata.log_min_frequency = Math.log (metadata.min_frequency);
    metadata.log_max_frequency = Math.log (metadata.max_frequency);
    metadata.height_in_log_frequency = metadata.log_max_frequency - metadata.log_min_frequency;
    metadata.height_in_semitones = metadata.height_in_log_frequency/log_semitone_ratio;   
}

window.get_coordinates = function (metadata, canvas_x, canvas_y_downwards) {
    let result = {};
    result.canvas_x = canvas_x;
    result.time = result.canvas_x/metadata.pixels_per_second + metadata.min_time;
    result.canvas_y_downwards = canvas_y_downwards;
    result.canvas_y_upwards = metadata.height - result.canvas_y_downwards;
    result.frequency = Math.exp(result.canvas_y_upwards/metadata.pixels_per_log_frequency + metadata.log_min_frequency);
    result.on_canvas_horizontally = (result.time >= metadata.min_time && result.time <= metadata.max_time);
    result.on_canvas_vertically = (result.canvas_y_downwards >= 0 && result.canvas_y_downwards <= metadata.height);
    result.on_canvas = result.on_canvas_horizontally && result.on_canvas_vertically;
    return result;
  };


window.frequency_position = function (dimensions, frequency, target) {
    let result = target || {};
    result.log_frequency = Math.log (frequency);
    result.canvas_y_downwards = (dimensions.log_max_frequency - result.log_frequency) * dimensions.pixels_per_log_frequency;
    //console.log(dimensions, frequency, target, result);
    return result;
  };
  
window.time_position = function (dimensions, time) {
    return (time - dimensions.min_time) * dimensions.pixels_per_second;
  };
  
window.note_coordinates = function (metadata, note, target) {
    let result = target || {};
    result.canvas_min_x = time_position(metadata, note.start);
    result.canvas_max_x = time_position(metadata, note.end);
    result.canvas_width = result.canvas_max_x - result.canvas_min_x;
    result.log_frequency = Math.log (note.frequency);
    let midh = metadata.log_max_frequency - result.log_frequency;
    result.canvas_min_y_downwards = metadata.canvas_height * ((midh - log_semitone_ratio/2) / metadata.height_in_log_frequency);
    result.canvas_max_y_downwards = metadata.canvas_height * ((midh + log_semitone_ratio/2) / metadata.height_in_log_frequency);
    result.canvas_height = result.canvas_max_y_downwards - result.canvas_min_y_downwards;
    result.min_displayed_frequency = note.frequency/sqrt_semitone_ratio;
    result.max_displayed_frequency = note.frequency*sqrt_semitone_ratio;
    return result;
  }
  




  let dragged_note = function (note) {
    let result = copy_note(note);
    
    if (drag_move.ends_only) {
      let time_shift = metadata.snap_time_to_grid(drag_move.reference_note.end + drag_move.current_coordinates.time - drag_move.original_coordinates.time) - drag_move.reference_note.end;
      result.end += time_shift;
      result.end = Math.max(result.end, Math.min(note.end, result.start + metadata.grid_step_size()));
    }
    else {
      let time_shift = metadata.snap_time_to_grid(drag_move.reference_note.start + drag_move.current_coordinates.time - drag_move.original_coordinates.time) - drag_move.reference_note.start;
      result.start += time_shift; result.end += time_shift;
      
      let frequency_shift = metadata.snap_frequency_to_semitones (drag_move.reference_note.frequency * drag_move.current_coordinates.frequency / drag_move.original_coordinates.frequency) / drag_move.reference_note.frequency;
      result.frequency *= frequency_shift;
    }
    
    result.coordinates = note_coordinates (result);
    return result;
  };
  
  let draw_note = function(note) {
    let coordinates = note.coordinates;
    
    let color = to_rgb("#000000");
    note.tags.forEach(function(tag) {
      let info = discover_tag (tag);
      color.red += info.red; color.blue += info.blue; color.green += info.green;
    });
    //console.log (color);
    if (note.tags.length > 0) {
      color.red /= note.tags.length; color.blue /= note.tags.length; color.green /= note.tags.length;
    }
    //console.log (color);
    //console.log (to_css_color(color));
    context.fillStyle = to_css_color(color);
    context.fillRect(coordinates.canvas_min_x, coordinates.canvas_min_y_downwards, coordinates.canvas_width, coordinates.canvas_height);
    if (selected_notes [note.index]) {
      context.strokeRect(coordinates.canvas_min_x, coordinates.canvas_min_y_downwards, coordinates.canvas_width, coordinates.canvas_height);
    }
  };



