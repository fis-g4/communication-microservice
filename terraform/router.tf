resource "google_compute_router" "communication_microservice_router" {
  name    = var.router_name
  region  = var.region
  network = "fis-g4-network-cd"

  bgp {
    asn = 64514
  }
}

resource "google_compute_subnetwork" "communication_microservice_subnetwork" {
  name          = "communication-microservice-subnetwork"
  ip_cidr_range = "10.0.11.0/24"
  region        = var.region
  network       = "fis-g4-network-cd"
}


resource "google_compute_router_nat" "communication_microservice_cloud_nat" {
  name                               = var.cloud_nat_name
  router                             = google_compute_router.communication_microservice_router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = google_compute_subnetwork.communication_microservice_subnetwork.name
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }
  

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}