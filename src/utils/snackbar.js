import {appAlert} from './appAlert';

export default function Snack(msg) {
  appAlert('', msg, [{text: 'OK'}]);
}
