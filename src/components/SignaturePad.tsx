import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { View, PanResponder, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS, SIZES } from '../utils/constants';

export interface SignaturePadRef {
  clear: () => void;
  getSignatureData: () => StrokeData[];
}

export interface StrokeData {
  path: string;
  color: string;
  width: number;
}

interface SignaturePadProps {
  onSignatureChange: (hasSignature: boolean) => void;
  strokeColor?: string;
  strokeWidth?: number;
  height?: number;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(({
  onSignatureChange,
  strokeColor = '#000000',
  strokeWidth = 2,
  height = 250,
}, ref) => {
  const [strokes, setStrokes] = useState<StrokeData[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const pathRef = useRef('');
  const strokesRef = useRef<StrokeData[]>([]);
  const onSignatureChangeRef = useRef(onSignatureChange);
  onSignatureChangeRef.current = onSignatureChange;

  const hasSignature = strokes.length > 0 || currentPath.length > 0;

  useImperativeHandle(ref, () => ({
    clear: () => {
      pathRef.current = '';
      strokesRef.current = [];
      setStrokes([]);
      setCurrentPath('');
      onSignatureChangeRef.current(false);
    },
    getSignatureData: () => strokesRef.current,
  }));

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent as { locationX: number; locationY: number };
        pathRef.current = `M${locationX},${locationY}`;
        setCurrentPath(pathRef.current);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent as { locationX: number; locationY: number };
        pathRef.current += ` L${locationX},${locationY}`;
        setCurrentPath(pathRef.current);
      },
      onPanResponderRelease: () => {
        const newStroke: StrokeData = {
          path: pathRef.current,
          color: strokeColor,
          width: strokeWidth,
        };
        strokesRef.current = [...strokesRef.current, newStroke];
        setStrokes(strokesRef.current);
        setCurrentPath('');
        pathRef.current = '';
        onSignatureChangeRef.current(true);
      },
    }),
  ).current;

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setDimensions({ w, h });
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.padContainer, { height }]} onLayout={handleLayout}>
        {dimensions.w > 0 && dimensions.h > 0 && (
          <Svg
            width={dimensions.w}
            height={dimensions.h}
            viewBox={`0 0 ${dimensions.w} ${dimensions.h}`}
            style={StyleSheet.absoluteFill}
          >
            {strokes.map((s, i) => (
              <Path
                key={i}
                d={s.path}
                stroke={s.color}
                strokeWidth={s.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {currentPath !== '' && (
              <Path
                d={currentPath}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </Svg>
        )}
        {!hasSignature && (
          <View style={styles.placeholderContainer} pointerEvents="none">
            <Text style={styles.placeholder}>Signez ici</Text>
          </View>
        )}
        <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: SIZES.BORDER_RADIUS_MD,
    overflow: 'hidden',
  },
  padContainer: {
    backgroundColor: COLORS.WHITE,
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    borderStyle: 'dashed',
    borderRadius: SIZES.BORDER_RADIUS_MD,
    overflow: 'hidden',
  },
  placeholderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    fontSize: SIZES.FONT_XL,
    color: COLORS.TEXT_MUTED,
    fontWeight: '300',
  },
});

export default SignaturePad;
