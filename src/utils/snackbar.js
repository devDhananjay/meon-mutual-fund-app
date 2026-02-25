import {Alert} from 'react-native';
import {Colors} from './AppConstant';

export default function Snack(msg) {
  Alert.alert('', msg, [{text: 'OK'}]);
}
