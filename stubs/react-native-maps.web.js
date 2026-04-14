// 웹 환경에서 react-native-maps 대체 스텁
const React = require('react');
const { View } = require('react-native');

const MapView = () => null;
MapView.displayName = 'MapView';

const Marker = () => null;
Marker.displayName = 'Marker';

const Callout = () => null;
const Circle = () => null;
const Polygon = () => null;
const Polyline = () => null;

module.exports = MapView;
module.exports.default = MapView;
module.exports.Marker = Marker;
module.exports.Callout = Callout;
module.exports.Circle = Circle;
module.exports.Polygon = Polygon;
module.exports.Polyline = Polyline;
