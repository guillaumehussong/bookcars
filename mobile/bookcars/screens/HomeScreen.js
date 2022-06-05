import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Pressable,
  Switch,
  ScrollView
} from 'react-native';
import Toast from 'react-native-root-toast';
import LocationSelectList from '../elements/LocationSelectList';
import DateTimePicker from '../elements/DateTimePicker';

import Env from '../config/env.config';
import i18n from '../lang/i18n';
import UserService from '../services/UserService';
import Helper from '../common/Helper';

const WINDOW_HEIGHT = Dimensions.get('window').height;
const WINDOW_WIDTH = Dimensions.get('window').width;

class HomeScreen extends Component {
  _isMounted = false;

  constructor(props) {
    super(props);

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() + 1);
    fromDate.setHours(0);
    fromDate.setMinutes(0);
    fromDate.setSeconds(0);
    fromDate.setMilliseconds(0);

    const fromTime = new Date(fromDate);
    fromTime.setHours(10);

    const toDate = new Date(fromDate);
    toDate.setDate(toDate.getDate() + 3);

    const toTime = new Date(toDate);
    toTime.setHours(10);

    this.state = {
      init: false,
      pickupLocation: null,
      dropOffLocation: null,
      close: false,
      sameLocation: true,
      fromDate,
      fromTime,
      toTime,
      toDate,
      language: Env.DEFAULT_LANGUAGE,
      orientation: Env.ORIENTATION.LANDSCAPE,
      windowWidth: WINDOW_WIDTH,
      windowHeight: WINDOW_HEIGHT,
      blur: false,

      closePickupLocation: false,
      closeDropOffLocation: false
    };
  }

  handlePickupLocationSelect = (pickupLocation) => {
    this.setState({ pickupLocation })
  };

  handleDropOffLocationSelect = (dropOffLocation) => {
    this.setState({ dropOffLocation })
  };

  blur = () => {
    this.setState({ blur: true, closePickupLocation: true, closeDropOffLocation: true })
  };

  handleTouchableOpacityClick = () => {
    this.blur();
  };

  dateTime = (date, time) => {
    const dateTime = new Date(date);
    dateTime.setHours(time.getHours());
    dateTime.setMinutes(time.getMinutes());
    dateTime.setSeconds(time.getSeconds());
    dateTime.setMilliseconds(time.getMilliseconds());
    return dateTime;
  };

  handleSameLocationChange = (checked) => {
    this.setState({ sameLocation: checked });
    this.blur();
  };

  handleSameLocationPress = () => {
    const { sameLocation } = this.state;

    this.setState({ sameLocation: !sameLocation });
    this.blur();
  };

  handleSearch = () => {
    this.blur();

    const { pickupLocation, sameLocation, fromDate, fromTime, toDate, toTime } = this.state;
    const from = this.dateTime(fromDate, fromTime);
    const to = this.dateTime(toDate, toTime);
    let { dropOffLocation } = this.state;

    if (sameLocation) dropOffLocation = pickupLocation;

    if (!pickupLocation) {
      return Toast.show(i18n.t('PICKUP_LOCATION_EMPTY'), {
        duration: Toast.durations.LONG,
      });
    }

    if (!dropOffLocation) {
      return Toast.show(i18n.t('DROP_OFF_LOCATION_EMPTY'), {
        duration: Toast.durations.LONG,
      });
    }

    console.log('pickupLocation', pickupLocation);
    console.log('dropOffLocation', dropOffLocation);
    console.log('from', from);
    console.log('to', to);

    // TODO cars
  };

  async componentDidMount() {
    this._isMounted = true;

    const language = await UserService.getLanguage();
    i18n.locale = language;
    this.setState({ init: true, language });

    const { windowWidth, windowHeight } = this.state;
    this.setState({ orientation: windowWidth < windowHeight ? Env.ORIENTATION.LANDSCAPE : Env.ORIENTATION.PORTRAIT })

    Dimensions.addEventListener('change', ({ window: { width, height } }) => {
      if (this._isMounted) {
        this.setState({
          orientation: width < height ? Env.ORIENTATION.LANDSCAPE : Env.ORIENTATION.PORTRAIT,
          windowWidth: width,
          windowHeight: height
        });
      }
    });
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  render() {
    const {
      init, close,
      sameLocation, fromDate, fromTime, toDate, toTime,
      language, windowWidth, windowHeight,
      blur, closePickupLocation, closeDropOffLocation } = this.state;

    return (
      init &&
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <View style={styles.contentContainer}>

          <View style={styles.logo}>
            <Text style={styles.logoMain}>BookCars</Text>
            <Text style={styles.logoRegistered}>®</Text>
          </View>

          <TouchableOpacity
            style={{
              position: 'absolute',
              backgroundColor: 'rgba(0, 0, 0, 0)',
              opacity: 0,
              width: windowWidth,
              height: windowHeight,
              left: 0,
              top: 0
            }}
            onPress={this.handleTouchableOpacityClick} />

          <LocationSelectList
            label={i18n.t('PICKUP_LOCATION')}
            style={styles.component}
            onSelectItem={this.handlePickupLocationSelect}
            onFetch={() => {
              this.setState({ closePickupLocation: false });
            }}
            onFocus={() => {
              this.setState({ blur: false, closeDropOffLocation: true });
            }}
            onChangeText={(text) => {
              this.setState({ closePickupLocation: text === '' });
            }}
            close={closePickupLocation}
            blur={blur}
          />

          <DateTimePicker
            mode='date'
            language={language}
            style={styles.date}
            label={i18n.t('FROM_DATE')}
            value={fromDate}
            onChange={(date) => this.setState({ fromDate: date })}
            onPress={this.blur}
          />

          <DateTimePicker
            mode='time'
            language={language}
            style={styles.date}
            label={i18n.t('FROM_TIME')}
            value={fromTime}
            onChange={(date) => this.setState({ fromTime: date })}
            onPress={this.blur}
          />

          <DateTimePicker
            mode='date'
            language={language}
            style={styles.date}
            label={i18n.t('TO_DATE')}
            value={toDate}
            onChange={(date) => this.setState({ toDate: date })}
            onPress={this.blur}
          />

          <DateTimePicker
            mode='time'
            language={language}
            style={styles.date}
            label={i18n.t('TO_TIME')}
            value={toTime}
            onChange={(date) => this.setState({ toTime: date })}
            onPress={this.blur}
          />

          <Pressable style={styles.search} onPress={this.handleSearch} >
            <Text style={styles.searchText}>{i18n.t('SEARCH')}</Text>
          </Pressable>

          {!sameLocation &&
            <LocationSelectList
              label={i18n.t('DROP_OFF_LOCATION')}
              style={styles.component}
              onSelectItem={this.handleDropOffLocationSelect}
              onFetch={() => {
                this.setState({ closeDropOffLocation: false });
              }}
              onFocus={() => {
                this.setState({ blur: false, closePickupLocation: true });
              }}
              onChangeText={(text) => {
                this.setState({ closeDropOffLocation: text === '' });
              }}
              close={closeDropOffLocation}
              blur={blur}
            />
          }

          <View style={styles.sameLocation}>
            <Switch trackColor={{ true: '#f7b68f', false: '#9d9d9d' }} thumbColor='#f37022' value={sameLocation} onValueChange={this.handleSameLocationChange} />
            <Text style={styles.sameLocationText} onPress={this.handleSameLocationPress}>{i18n.t('SAME_LOCATION')}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.copyright}>{i18n.t('COPYRIGHT_PART1')}</Text>
          <Text style={styles.copyrightRegistered}>{i18n.t('COPYRIGHT_PART2')}</Text>
          <Text style={styles.copyright}>{i18n.t('COPYRIGHT_PART3')}</Text>
        </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    zIndex: 1,
    elevation: Helper.android() ? 1 : 0,
    justifyContent: 'center',
    paddingBottom: 50,
    flexGrow: 1
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logo: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 10
  },
  logoMain: {
    color: '#f37022',
    fontSize: 70,
    fontWeight: '700',
    lineHeight: 125
  },
  logoRegistered: {
    color: '#f37022',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 40
  },
  component: {
    alignSelf: 'stretch',
    margin: 10
  },
  date: {
    alignSelf: 'stretch',
    margin: 10
  },
  search: {
    borderWidth: 0,
    borderRadius: 10,
    height: 55,
    alignSelf: 'stretch',
    flexDirection: 'row',
    backgroundColor: '#f37022',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 10
  },
  searchText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    textTransform: 'uppercase'
  },
  sameLocation: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    paddingBottom: 10,
    display: 'flex',
    alignItems: 'center'
  },
  sameLocationText: {
    color: 'rgba(0, 0, 0, .7)',
    fontSize: 13,
    fontWeight: '400',
    padding: 5
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderTopWidth: 1,
    borderTopColor: '#ebebeb',
    alignSelf: 'stretch',
    flexDirection: 'row'
  },
  copyright: {
    fontSize: 12,
    color: '#70757a',
  },
  copyrightRegistered: {
    fontSize: 10,
    color: '#70757a',
    position: 'relative',
    top: -5
  }
});

export default HomeScreen;