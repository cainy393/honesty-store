import React from 'react';
import { ListGroupItem, Button, Grid, Col, Row } from 'react-bootstrap';
import './Product.css'

class Product extends React.Component {

  render() {
    return (
      <ListGroupItem>
        <Grid>
          <Row className="vertical-align">
            <Col xs={8}>
              <p className="product-name">{this.props.name}</p>
            </Col>
            <Col xs={4}>
              <Button bsStyle="success" bsSize="small">Buy (£{this.props.price.toFixed(2)})</Button>
            </Col>
          </Row>
        </Grid>
      </ListGroupItem>
    )
  }
}

export default Product;
