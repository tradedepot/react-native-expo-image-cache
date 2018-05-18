// @flow
import * as _ from "lodash";
import * as React from "react";
import { Image as RNImage, Animated, StyleSheet, View, Platform } from "react-native";
import { type ImageStyle } from "react-native/Libraries/StyleSheet/StyleSheetTypes";
import type { ImageSourcePropType } from "react-native/Libraries/Image/ImageSourcePropType";

import CacheManager from "./CacheManager";

type ImageProps = {
    style?: ImageStyle,
    defaultSource?: ImageSourcePropType,
    preview?: ImageSourcePropType,
    uri: string
};

type ImageState = {
    uri: ?string,
    intensity: Animated.Value
};

const propsToCopy = [
    "borderRadius",
    "borderBottomLeftRadius",
    "borderBottomRightRadius",
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "width",
    "height"
];
const black = "black";

export default class Image extends React.Component<ImageProps, ImageState> {
    static defaultProps = {
        style: null,
        defaultSource: null,
        preview: null
    };
    state = {
        uri: undefined,
        intensity: new Animated.Value(100)
    };

    componentDidMount() {
        this.load(this.props);
    }

    componentDidUpdate(prevProps: ImageProps, prevState: ImageState) {
        const { preview } = this.props;
        const { uri, intensity } = this.state;
        if (this.props.uri !== prevProps.uri) {
            this.load(this.props);
        } else if (uri && preview && prevState.uri === undefined) {
            Animated.timing(intensity, {
                duration: 300,
                toValue: 0,
                useNativeDriver: Platform.OS === "android"
            }).start();
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    mounted = true;

    async load({ uri }: ImageProps): Promise<void> {
        if (uri) {
            const path = await CacheManager.get(uri).getPath();
            if (this.mounted) {
                const prefix = Platform.OS === "android" ? "file:" : "";
                this.setState({ uri: path && `${prefix}${path}` });
            }
        }
    }

    render(): React.Node {
        const { preview, style, defaultSource, ...otherProps } = this.props;
        const { uri, intensity } = this.state;
        const hasDefaultSource = !!defaultSource;
        const hasPreview = !!preview;
        const isImageReady = !!uri;
        const opacity = intensity.interpolate({
            inputRange: [0, 100],
            outputRange: [0, 0.5]
        });
        const computedStyle = [
            StyleSheet.absoluteFill,
            _.pickBy(StyleSheet.flatten(style), (value, key) => propsToCopy.indexOf(key) !== -1)
        ];
        return (
            <View style={style}>
                {hasDefaultSource &&
                    !hasPreview &&
                    !isImageReady && (
                    <RNImage resizeMode="cover" source={defaultSource} style={computedStyle} {...otherProps} />
                )}
                {hasPreview && (
                    <RNImage
                        source={preview}
                        resizeMode="cover"
                        style={computedStyle}
                        blurRadius={Platform.OS === "android" ? 0.5 : 0}
                    />
                )}
                {isImageReady && <RNImage resizeMode="cover" source={{ uri }} style={computedStyle} {...otherProps} />}
                {hasPreview && <Animated.View style={[computedStyle, { backgroundColor: black, opacity }]} />}
            </View>
        );
    }
}
