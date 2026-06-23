import React, { useState } from "react";
import Slider from "react-slick";
import { Modal } from "react-bootstrap";

function ImagemCarousel({ imagens, nome }) {
  const [zoom, setZoom] = useState(null);

  const settings = {
    dots: true,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 3000,
    swipeToSlide: true,
    arrows: false,
  };

  return (
    <>
      <Slider {...settings}>
        {imagens.map((img, i) => (
          <div key={i}>
            <img
              src={img}
              alt={`${nome} ${i + 1}`}
              onClick={() => setZoom(img)}
              style={{
                width: "100%",
                objectFit: "cover",
                aspectRatio: "4 / 3",
                borderRadius: "10px",
                cursor: "zoom-in",
              }}
            />
          </div>
        ))}
      </Slider>

      <Modal show={!!zoom} onHide={() => setZoom(null)} centered>
        <Modal.Body className="p-0">
          <img
            src={zoom}
            alt="Zoom"
            style={{ width: "100%", objectFit: "contain" }}
          />
        </Modal.Body>
      </Modal>
    </>
  );
}

export default ImagemCarousel;
