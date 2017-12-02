window.semitone_ratio = Math.pow (2, 1/12);
window.sqrt_semitone_ratio = Math.pow (2, 1/24);
window.log_semitone_ratio = Math.log (semitone_ratio);

const note_info = [
    {name:"C", color:"white"},
    {name:"Db", color:"black"},
    {name:"D", color:"white"},
    {name:"Eb", color:"black"},
    {name:"E", color:"white"},
    {name:"F", color:"white"},
    {name:"Gb", color:"black"},
    {name:"G", color:"white"},
    {name:"Ab", color:"black"},
    {name:"A", color:"white"},
    {name:"Bb", color:"black"},
    {name:"B", color:"white"},
];
window.semitones_to_note_info = function (semitones) {
  return note_info [(semitones+48) % 12];
}
window.semitones_to_note_name = function (semitones) {
  return semitones_to_note_info (semitones).name + (Math.floor ((semitones+48)/12)).toString();
}

window.midi_pitch_to_frequency = function (pitch) {
  return 440.0*Math.pow(semitone_ratio, pitch-69);
}
window.frequency_to_fractional_midi_pitch = function (frequency) {
  return 69 + Math.round(Math.log(frequency/440.0)/log_semitone_ratio);
}
window.frequency_to_nearest_midi_pitch = function (frequency) {
  return Math.round(frequency_to_fractional_midi_pitch(frequency));
}

window.to_rgb = function (color) {
  return {
    red: parseInt (color.substring (1, 3), 16),
    green: parseInt (color.substring (3, 5), 16),
    blue: parseInt (color.substring (5, 7), 16),
  };
}

window.to_css_color = function (color) {
  return `rgb(${Math.round(color.red)}, ${Math.round(color.green)}, ${Math.round(color.blue)})`;
}

