import React from 'react';
import { connect } from 'react-redux';
import { performRefund } from '../actions/refund';
import { Back } from '../chrome/link';
import Full from '../layout/full';
import './index.css';

const Radio = ({ name, value, onClick, text }) =>
  <div>
    <input type="radio" name={name} id={value} value={value} onClick={() => onClick(value)} />
    <label htmlFor={value} className="h3"><span className="radio"></span>{text}</label>
  </div>;

class RefundRequest extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      refundReason: ''
    };
  }

  handleRadioClick(name) {
    this.setState({
      refundReason: name
    })
  }

  handleRefundRequest() {
    const { refundReason } = this.state;
    const valid = refundReason !== '';
    this.setState({
      valid: false
    });
    if (valid) {
      const { performRefund, params: { transactionId } } = this.props;
      performRefund({ transactionId, reason: refundReason });
    }
  }

  render() {

    const { itemName } = this.props;

    return (
      <Full left={<Back></Back>}>
        <div className="refund-request">
          <h2 className="regular">Mind telling us why you'd like a refund for your {itemName}?</h2>
          <form className="col-8 sm-col-6 mx-auto center">
            <div className="py2 left-align">
              <Radio name="refund" value="accidentalPurchase" text="I didn't mean to buy it" onClick={() => this.handleRadioClick('accidentalPurchase')} />
            </div>
            <div className="py2 left-align">
              <Radio name="refund" value="outOfStock" text="It's out of stock" onClick={() => this.handleRadioClick('outOfStock')} />
            </div>
            <div className="py2 left-align">
              <Radio name="refund" value="stockExpired" text="It's passed its expiry date" onClick={() => this.handleRadioClick('stockExpired')} />
            </div>
          </form>
          <p className="btn btn-primary btn-big center mt2 h3" onClick={() => this.handleRefundRequest()}>Submit refund request</p>
        </div>
      </Full>
    );
  }
}

const mapStateToProps = ({ user: { transactions }, store: { items } }, { params: { transactionId } }, ownProps) => {
  const { data: { itemId } } = transactions.find(({ id }) => id === transactionId);
  if (itemId == null) {
    console.error('Transaction cannot be refunded');
  }
  const { name: itemName } = items.find(({ id }) => id === itemId);
  return {
    ...ownProps,
    itemName
  }
}

export default connect(mapStateToProps, { performRefund })(RefundRequest);