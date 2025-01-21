import StaticDataStore from "@/store/StaticDataStore";

const calculateBounds = (coordinates) => {
  const min_x = Math.min(...coordinates.map((coord) => coord[0]));
  const max_x = Math.max(...coordinates.map((coord) => coord[0]));
  const min_y = Math.min(...coordinates.map((coord) => coord[1]));
  const max_y = Math.max(...coordinates.map((coord) => coord[1]));
  return { min_x, max_x, min_y, max_y };
};

const transformCoordinates = (
  coordinates,
  svgWidth,
  svgHeight,
  startX,
  startY
) => {
  const { min_x, max_x, min_y, max_y } = calculateBounds(coordinates);
  const x_scale = (svgWidth * 0.95) / (max_x - min_x);
  const y_scale = (svgHeight * 0.95) / (max_y - min_y);
  const scale = Math.min(x_scale, y_scale);
  return coordinates.map(([x, y]) => [
    scale * (x - min_x) + startX + svgWidth * 0.025,
    svgHeight - scale * (y - min_y) + startY - svgHeight * 0.025,
  ]);
};

export const getGeoPathData = (
  GEOID,
  svgWidth,
  svgHeight,
  startX = 0,
  startY = 0
) => {
  const geoJson = StaticDataStore.getGeoJson;
  const coordinates = geoJson.features.find(
    (ele) => ele.properties.GEOID == GEOID
  ).geometry.coordinates[0];
  const transformedCoords = transformCoordinates(
    coordinates,
    svgWidth,
    svgHeight,
    startX,
    startY
  );
  return `M ${transformedCoords.map((coord) => coord.join(",")).join(" L ")} Z`;
};
